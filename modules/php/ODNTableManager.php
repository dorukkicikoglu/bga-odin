<?php

class TableManager extends APP_DbObject{
    function __construct($parent) {
        $this->parent = $parent;
    }

    function shuffleAndDealCards(){
        self::DbQuery("UPDATE cards SET card_location = 'draw_pile' WHERE card_location <> 'returned_to_box'");
        $this->parent->cardsDeck->shuffle('draw_pile');

        $playerIDs = self::getObjectListFromDB("SELECT player_id FROM player", true);
        foreach($playerIDs as $index => $player_id){
            $start = $index * HAND_SIZE;
            $end = $start + HAND_SIZE - 1;

            self::DbQuery("UPDATE cards SET card_location = 'player', card_location_arg = $player_id WHERE card_location = 'draw_pile' AND card_location_arg >= $start AND card_location_arg <= $end");
        }
    }

    function getTableCardsCount($cardLocation = 'on_table'){ return (int) $this->getUniqueValueFromDB("SELECT count(*) FROM cards WHERE card_location = '$cardLocation'"); }
    function getWasTableCardsCount(){ return $this->getTableCardsCount('was_on_table'); }

    function getCardsOnTable($cardLocation = 'on_table'){ 
        $tableCards = $this->getObjectListFromDB( "SELECT card_id, suit, rank, card_location_arg as card_owner_id FROM cards WHERE card_location = '$cardLocation' ORDER BY rank DESC, suit" ); 
        if(!$tableCards)
            return [];

        return ['tableCards' => $tableCards, 'cardsOwnerID' => $tableCards[0]['card_owner_id']];
    }
    function getCardsWasOnTable(){ return $this->getCardsOnTable('was_on_table'); }

    function getCardsDataSummation($cardsData){
        $ranks = array_map(function($card) { return $card['rank']; }, $cardsData);
        rsort($ranks);
        
        $largestNumber = implode('', $ranks);
        return (int) $largestNumber;
    }

    function getTableCardsSummation(){ 
        $tableCards = $this->getCardsOnTable();
        if(!isset($tableCards['tableCards']))
            return 0;
        return $this->getCardsDataSummation($tableCards['tableCards']); 
    }

    function tableIsAllNines(){
        $tableCards = $this->getCardsOnTable();
        
        if(!isset($tableCards['tableCards']))
            return false;

        foreach($tableCards['tableCards'] as $index => $card)
            if((int) $card['rank'] != 9)
                return false;

        return true;
    }

    function playCards($cardIDs, $autoPlay = false){
        $this->parent->gamestate->checkPossibleAction('playCards');
        if(!$autoPlay)
            $this->parent->checkAction('playCards');

        if(array_filter($cardIDs, function($value){ return is_numeric($value) || (int) $value == $value; }) != $cardIDs)
            $this->parent->sendError(110);

        $activePlayerID = $this->parent->getActivePlayerId();

        $cardIDsSQL = implode(',', $cardIDs);
        $playedCardsData = $this->getObjectListFromDB( "SELECT card_id, suit, rank FROM cards WHERE card_id IN ($cardIDsSQL) AND card_location = 'player' AND card_location_arg = $activePlayerID ORDER BY suit, rank DESC" );

        if(!$this->doCardsMakeSet($playedCardsData)){
            !$autoPlay && $this->parent->sendError(111);
            return false;
        }

        $tableCardsCount = $this->getTableCardsCount();
        $tableCardsDifference = count($cardIDs) - $tableCardsCount;

        if($tableCardsDifference > 1 || $tableCardsDifference < 0) {
            $playerHand = $this->parent->handManager->getPlayerHand($activePlayerID);
            $canPlayOneLongSet = ($tableCardsCount == 0 && count($playerHand) == count($playedCardsData));

            if(!$canPlayOneLongSet){
                !$autoPlay && $this->parent->sendWarning('too_many_cards', $tableCardsCount, $tableCardsCount + 1);
                return false;
            }
        }
        
        $playedCardsSummation = $this->parent->tableManager->getCardsDataSummation($playedCardsData);

        if($tableCardsCount > 0) { //need to check if new cards increase the current card
            $tableCardsSummation = $this->parent->tableManager->getTableCardsSummation();

            if($tableCardsSummation >= $playedCardsSummation){
                !$autoPlay && $this->parent->sendWarning('too_low_value', $tableCardsSummation);
                return false;
            }
        }

        self::DbQuery("UPDATE cards SET card_location = 'was_on_table' WHERE card_location = 'on_table'"); //place previous table cards to the side
        self::DbQuery("UPDATE cards SET card_location = 'on_table' WHERE card_id IN ($cardIDsSQL)"); //place selected cards on the table
        $this->parent->giveExtraTime($activePlayerID);

        $highestPlayedNumber_table = (int) $this->parent->getStat("table_highest_played_number");
        if($playedCardsSummation > $highestPlayedNumber_table){
            $this->parent->setStat($playedCardsSummation, 'table_highest_played_number');
            $this->parent->setStat(count($cardIDs), 'table_highest_played_num_digits');
        }

        $highestPlayedNumber_player = (int) $this->parent->getStat("player_highest_played_number", $activePlayerID);
        if($playedCardsSummation > $highestPlayedNumber_player){
            $this->parent->setStat($playedCardsSummation, 'player_highest_played_number', $activePlayerID);
            $this->parent->setStat(count($cardIDs), 'player_highest_played_num_digits', $activePlayerID);
        }

        $this->parent->incStat(count($cardIDs), "table_played_cards_count");
        $this->parent->incStat(count($cardIDs), "player_played_cards_count", $activePlayerID);

        $shouldEndHand = $this->shouldEndHand();

        $playedCardsStr = []; //needed for the game replay page
        foreach($playedCardsData as $cardIndex => $cardData)
            $playedCardsStr[] = $this->parent->getCardLogHTML($cardData);
        $playedCardsStr = implode('&nbsp;', $playedCardsStr);

        $this->parent->notifyAllPlayers('cardsPlayed', '${player_name} ${ARROW_RIGHT} ${CARD_ICONS_STR}', array(
            'cardsOwnerID' => $activePlayerID,
            'player_name' => $this->parent->getPlayerNameById($activePlayerID),
            'ARROW_RIGHT' => '→',
            'CARD_ICONS_STR' => $playedCardsStr,
            'CARD_ICONS' => $playedCardsData,
            'played_cards' => $playedCardsData,
            'handCount' => $this->parent->handManager->getPlayerHandCount($activePlayerID),
            'shouldEndHand' => $shouldEndHand
        ));

        if($shouldEndHand)
            $this->doEndHand();
        else $this->parent->switchToTakeCard();

        return true;
    }

    function doCardsMakeSet($playedCardsData){
        $suitDict = [];
        $rankDict = [];

        foreach($playedCardsData as $key => $row){
            $suitDict[$row['suit']] = 1;
            $rankDict[$row['rank']] = 1;
        }

        return count(array_keys($suitDict)) == 1 || count(array_keys($rankDict)) == 1;
    }

    function shouldEndHand(){
        $activePlayerID = $this->parent->getActivePlayerId();
        $playerHandCount = $this->parent->handManager->getPlayerHandCount($activePlayerID);
        return $playerHandCount <= 0;
    }

    function doEndHand(){
        $remainingCards = self::getCollectionFromDB("SELECT card_location_arg AS player_id, COUNT(*) AS card_count FROM cards WHERE card_location = 'player' GROUP BY card_location_arg", true);

        $playerScores = self::getCollectionFromDb( "SELECT player_id, player_score FROM player", true );

        foreach($remainingCards as $nextPlayerID => $cardCount){
            $cardCount = (int) $cardCount;
            $playerScores[$nextPlayerID] -= $cardCount;
            $this->DbQuery( "UPDATE player SET player_score = ".$playerScores[$nextPlayerID]." WHERE player_id = $nextPlayerID" );

            $this->parent->notifyAllPlayers("playerLosesPoints", clienttranslate('${player_name} loses ${score} ${SCORE_ICON}'), array(
                'player_name' => $this->parent->getPlayerNameById($nextPlayerID),
                'score' => $cardCount,
                'SCORE_ICON' => '★'
            ));
        }

        $this->parent->notifyAllPlayers("newScores", '', array( 'newScores' => $playerScores ) );

        if($this->shouldEndGame()){
            $this->doEndGame();
            return;
        }

        $this->parent->gamestate->nextState('newHand');
    }

    function shouldEndGame(){
        $gameLength = (int) $this->parent->globalsManager->get('game_length');

        if(($gameLength == ONE_HAND_GAME_SPECIAL_VALUE)){
            $playerWithoutCards = $this->getObjectFromDB("SELECT p.player_id as player_id FROM player p LEFT JOIN cards c ON p.player_id = c.card_location_arg AND c.card_location = 'player' AND c.card_location_arg IS NULL LIMIT 1");

            return isset($playerWithoutCards['player_id']);
        }

        $finishedPlayer = $this->getObjectFromDB("SELECT player_id FROM player WHERE player_score <= 0 LIMIT 1");
        return isset($finishedPlayer['player_id']);
    }

    function doEndGame(){ 
        self::DbQuery("UPDATE cards SET card_location = 'discarded', card_location_arg = 0 WHERE card_location = 'was_on_table'");
        $this->parent->gamestate->nextState('gameEnd'); 
    }
}

?>