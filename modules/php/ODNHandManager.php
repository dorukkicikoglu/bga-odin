<?php

class HandManager extends APP_DbObject{
    function __construct($parent) {
        $this->parent = $parent;
    }

    function getPlayerHand($playerID) { 
        $orderBy = $this->getUniqueValueFromDB("SELECT sort_cards_by FROM player WHERE player_id = $playerID");

        if($orderBy == 'suit')
            $orderBy = 'suit, rank DESC';
        else $orderBy = 'rank DESC, suit';

    	return $this->getObjectListFromDB( "SELECT card_id, suit, rank FROM cards WHERE card_location = 'player' AND card_location_arg = '$playerID' ORDER BY $orderBy" );
    }

    function getPlayerHandCount($playerID){
        $countData = $this->getPlayersHandCount([$playerID]);
        return isset($countData[$playerID]) ? $countData[$playerID] : 0;
    } 

    function getPlayersHandCount($playerIDs = null) { 
        $playerIDsSQL = $playerIDs ? ' AND card_location_arg IN ('.implode(',', $playerIDs).') ' : '';

        $handCounts = self::getCollectionFromDB("SELECT card_location_arg AS player_id, COUNT(*) AS card_count FROM cards WHERE card_location = 'player' ".$playerIDsSQL."GROUP BY card_location_arg", true);

        foreach ($handCounts as $playerID => $handCount)
        	$handCounts[$playerID] = (int) $handCount;

    	return $handCounts;
    }

    function giveCardToPlayer($cardID, $playerID){ self::DbQuery("UPDATE cards SET card_location = 'player', card_location_arg = $playerID  WHERE card_id = $cardID"); }

    function takeCardFromTableToHand($cardID, $autoPlay = false, $zombiePlayerID = false){
        $this->parent->checkAction('takeCardFromTableToHand');

        $takerPlayerID = $zombiePlayerID ? $zombiePlayerID : $this->parent->getActivePlayerId();

        $takenCardData = $this->getObjectFromDB( "SELECT card_id, suit, rank FROM cards WHERE card_location = 'was_on_table' AND card_id=$cardID" );
        if(!isset($takenCardData['card_id']))
            $this->parent->sendError(112);

        $this->giveCardToPlayer($cardID, $takerPlayerID);
        self::DbQuery("UPDATE cards SET card_location = 'discarded', card_location_arg = 0 WHERE card_location = 'was_on_table'");

        if(!$autoPlay)
            $this->parent->giveExtraTime($takerPlayerID);

        $handCount = $this->getPlayerHandCount($takerPlayerID);
        $takenCardStr = $this->parent->getCardLogHTML($takenCardData);

        $this->parent->notifyAllPlayers('cardTakenFromTable', '${player_name} ${ARROW_LEFT} ${CARD_ICONS_STR}', array(
            'cardsOwnerID' => $takerPlayerID,
            'player_name' => $this->parent->getPlayerNameById($takerPlayerID),
            'ARROW_LEFT' => '⇐',
            'CARD_ICONS_STR' => $takenCardStr,
            'CARD_ICONS' => [$takenCardData],
            'taken_card' => $takenCardData,
            'handCount' => $handCount
        ));

        $this->parent->gamestate->nextState( "nextPlayer" );
    }
}

?>