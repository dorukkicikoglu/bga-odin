<?php
 /**
  *------
  * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
  * odin implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
  * 
  * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
  * See http://en.boardgamearena.com/#!doc/Studio for more information.
  * -----
  * 
  * odin.game.php
  *
  * This is the main file for your game logic.
  *
  * In this PHP file, you are going to defines the rules of the game.
  *
  */


require_once( APP_GAMEMODULE_PATH.'module/table/table.game.php' );

require_once ('modules/php/ODNGlobalsManager.php');
require_once ('modules/php/ODNHandManager.php');
require_once ('modules/php/ODNTableManager.php');

class odin extends Table
{
    public GlobalsManager $globalsManager;
    public $cardsDeck;
    public HandManager $handManager;
    public TableManager $tableManager;

	function __construct( )
	{
        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();
        
        $this->globalsManager = new GlobalsManager($this, 
            $globalKeys = array(
                'last_hand_opener_player_id' => 10,
                //game options
                'game_length' => 100,
            ),
            $userPrefs = array(
                'auto_finish_hand' => 101,
                'walking_characters' => 100
            )
        );

        $this->cardsDeck = self::getNew("module.common.deck");
        $this->cardsDeck->init("cards");

        $this->handManager = new HandManager($this);
        $this->tableManager = new TableManager($this);
	}
	
    protected function getGameName( )
    {
		// Used for translations and stuff. Please do not modify.
        return "odin";
    }	

    /*
        setupNewGame:
        
        This method is called only once, when a new game is launched.
        In this method, you must setup the game according to the game rules, so that
        the game is ready to be played.
    */
    protected function setupNewGame( $players, $options = array() )
    {    
        // Set the colors of the players with HTML color code
        // The default below is red/green/blue/orange/brown
        // The number of colors defined here must correspond to the maximum number of players allowed for the gams
        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos['player_colors'];
 
        // Create players
        // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
        $sql = "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ";
        $values = array();
        foreach( $players as $player_id => $player )
        {
            $color = array_shift( $default_colors );
            $values[] = "('".$player_id."','$color','".$player['player_canal']."','".addslashes( $player['player_name'] )."','".addslashes( $player['player_avatar'] )."')";
        }
        $sql .= implode( ',', $values );
        $this->DbQuery( $sql );
        $this->reattributeColorsBasedOnPreferences( $players, $gameinfos['player_colors'] );
        $this->reloadPlayersBasicInfos();
        
        /************ Start the game initialization *****/

        // Init global values with their initial values
        $this->globalsManager->initValues(array(
           "last_hand_opener_player_id" => null,
        ));

        // Init game statistics
        // (note: statistics used in this file must be defined in your stats.inc.php file)
        self::initStat("table", "table_total_hand_count", 0);
        self::initStat("table", "table_total_round_count", 0);
        self::initStat("table", "table_highest_played_number", 0);
        self::initStat("table", "table_highest_played_num_digits", 0);
        self::initStat("table", "table_pass_count", 0);

        self::initStat("player", "player_highest_played_number", 0);
        self::initStat("player", "player_highest_played_num_digits", 0);
        self::initStat("player", "player_pass_count", 0);
        self::initStat("player", "player_turn_count", 0);
        self::initStat("player", "player_played_cards_count", 0);

        //create cards Deck object
        $cardRows = array();
        for($i = 1; $i <= SUIT_COUNT; $i++)
            for($j = 1; $j <= HIGHEST_RANK; $j++)
                $cardRows[] = "(NULL, 'card', '0', 'draw_pile', '0', '$i', '$j')";

        self::DbQuery("INSERT INTO cards (card_id, card_type, card_type_arg, card_location, card_location_arg, suit, rank) VALUES ".implode(',', $cardRows)); 

        if(self::getPlayersNumber() === 2){ //in a 2-player game, remove 2 suits
            $allColors = range(1, SUIT_COUNT);
            $removedRedOrBlack = rand(0, 1) ? 2 : 5; //red and black shouldn't come together for colorblind accomodation
            $colorsRemaining = array_values(array_filter($allColors, fn($suit) => $suit !== $removedRedOrBlack));
            $otherRemovedColor = $colorsRemaining[array_rand($colorsRemaining)];

            self::DbQuery("UPDATE cards SET card_location = 'returned_to_box' WHERE suit = $removedRedOrBlack OR suit = $otherRemovedColor");
        }

        $this->tableManager->shuffleAndDealCards();

        $gameLength = (int) $this->globalsManager->get('game_length');
        $startScore = ($gameLength == ONE_HAND_GAME_SPECIAL_VALUE) ? HAND_SIZE : $gameLength; 
        $this->DbQuery( "UPDATE player SET player_score = $startScore" );

        // Activate first player (which is in general a good idea :) )
        $this->activeNextPlayer();

        $activePlayerID = $this->getActivePlayerId();
        $this->globalsManager->set('last_hand_opener_player_id', $activePlayerID);

        /************ End of the game initialization *****/
    }

    /*
        getAllDatas: 
        
        Gather all informations about current game situation (visible by the current player).
        
        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)
    */
    protected function getAllDatas(): array
    {
        $result = array();
        $result['version'] = intval($this->gamestate->table_globals[300]);

        $current_player_id = $this->getCurrentPlayerId();    // !! We must only return informations visible by this player !!
    
        // Get information about players
        // Note: you can retrieve some extra field you added for "player" table in "dbmodel.sql" if you need it.
        $sql = "SELECT player_id id, player_no, player_score score FROM player ";
        $result['players'] = $this->getCollectionFromDb( $sql );
        $otherPlayerHandCounts = $this->handManager->getPlayersHandCount();

        foreach ($otherPlayerHandCounts as $playerID => $handCount)
            $result['players'][(string) $playerID]['handCount'] = $handCount;

        $result['my_hand'] = $this->handManager->getPlayerHand($current_player_id);
        $result['sort_cards_by'] = $this->getUniqueValueFromDB("SELECT sort_cards_by FROM player WHERE player_id = $current_player_id");
        $result['tableCards'] = $this->tableManager->getCardsOnTable();
        
        $prevSetData = $this->tableManager->getCardsWasOnTable();
        $result['prevSet'] = isset($prevSetData['tableCards']) ? $prevSetData['tableCards'] : [];

        $result['pref_names'] = $this->globalsManager->userPrefs;

        return $result;
    }

    /*
        getGameProgression:
        
        Compute and return the current game progression.
        The number returned must be an integer beween 0 (=the game just started) and
        100 (= the game is finished or almost finished).
    
        This method is called each time we are in a game state with the "updateGameProgression" property set to true 
        (see states.inc.php)
    */
    function getGameProgression()
    {
        $gameLength = (int) $this->globalsManager->get('game_length');
        $progression = 0;

        if(($gameLength == ONE_HAND_GAME_SPECIAL_VALUE)){
            $smallestHandCardsCount = (int) $this->getUniqueValueFromDB("SELECT COUNT(c.card_location_arg) AS card_count FROM player p LEFT JOIN cards c ON p.player_id = c.card_location_arg AND c.card_location = 'player' GROUP BY p.player_id ORDER BY card_count ASC LIMIT 1");

            $progression = 100 * ((HAND_SIZE - $smallestHandCardsCount) / HAND_SIZE);
        } else {
            $lowestPlayerScore = (int) $this->getUniqueValueFromDB("SELECT MIN(player_score) FROM player");
            $progression = 100 * (($gameLength - $lowestPlayerScore) / $gameLength);
        }

        $progression = min(100, $progression);
        
        if($progression <= 0 && $this->tableManager->getTableCardsCount() > 0)
            $progression = 1;

        return $progression;
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Utility functions
////////////    

    function sendError($errorCode, $errorMsg = false){ throw new BgaVisibleSystemException(sprintf(self::_("Error %d".($errorMsg ? ' - '.$errorMsg : '')), $errorCode), $errorCode); }
    function sendWarning($errorType, ...$args){
        $errorMessages = [
            'too_many_cards' => self::_("You can play either %d or %d cards"),
            'too_low_value' => self::_("Your cards need to value higher than %d"),
        ];

        if (!isset($errorMessages[$errorType]))
            throw new BgaUserException(self::_("Unknown error type"));

        $formattedMessage = vsprintf($errorMessages[$errorType], $args); // Format the message with the provided arguments
        throw new BgaUserException($formattedMessage); // Throw the exception with the formatted message
    }

    function getCardLogHTML($cardData){ 
        $suitData = SUIT_DATA[(int) $cardData['suit']];
        return '<div style="display: inline-block;margin-left: 8px; background-color: #'.$suitData['colorCode'].'; transform: rotate(45deg); width: 16px; height: 16px; "><span style="position: absolute;opacity: 0;width: 0px;height: 0px;">'.$suitData['name'].'-</span><span style="position: absolute; width: 100%; height: 100%; transform: rotate(-45deg); text-align: center; line-height: 18px; color: #f8f4ed;">'.$cardData['rank'].'</span></div>'; 
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Player actions
//////////// 

    /*
        Each time a player is doing some game action, one of the methods below is called.
        (note: each method below must match an input method in odin.action.php)
    */

    function setSortCardsBy($isSuit){
        $current_player_id = self::getCurrentPlayerId();
        $sortBy = $isSuit ? 'suit' : 'rank';

        self::DbQuery("UPDATE player SET sort_cards_by = '$sortBy' WHERE player_id = $current_player_id");
    }

    function passTurn($autoPlay = false){
        $this->gamestate->checkPossibleAction('passTurn');
        $activePlayerID = $this->getActivePlayerId();

        if(!$autoPlay){
            $this->checkAction('passTurn');
            $this->giveExtraTime($activePlayerID);
        }

        $this->notifyAllPlayers('turnPassed', ($autoPlay ? clienttranslate('${player_name} auto-passes') : clienttranslate('${player_name} passes')), array(
            'player_name' => $this->getPlayerNameById($this->getActivePlayerId()),
            'passingPlayerID' => $activePlayerID,
            'autoPass' => $autoPlay
        ));

        self::incStat(1, "table_pass_count");
        self::incStat(1, "player_pass_count", $activePlayerID);

        $this->gamestate->nextState( "nextPlayer" );
    }

    function autoPlayCardsIfNeeded(){
        $activePlayerID = $this->getActivePlayerId();
        $tableCardsCount = $this->tableManager->getTableCardsCount();
        $playerHand = $this->handManager->getPlayerHand($activePlayerID);

        if(count($playerHand) <= 0)
            return false;

        $autoPass = count($playerHand) < $tableCardsCount;
        $autoPass = $autoPass || (count($playerHand) == $tableCardsCount && $this->tableManager->tableIsAllNines());

        if($autoPass){ //auto-pass
            $this->passTurn(true);
            return false;
        } 

        $autoPlay = (count($playerHand) == 1 && $tableCardsCount == 0); //auto-play if player has only 1 card in hand at the start of a round
        $autoFinishOn = $this->globalsManager->getPref('auto_finish_hand', $activePlayerID) == AUTO_FINISH_HAND_ON;
        $autoPlay = $autoPlay || $autoFinishOn;

        if($autoPlay){
            $autoPlaySuccessful = $this->tableManager->playCards(array_column($playerHand, 'card_id'), true);
            if(!$autoPlaySuccessful && $autoFinishOn && count($playerHand) == $tableCardsCount)
                $this->passTurn(true);
        }

        return true;
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////

    /*
        Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
        These methods function is to return some additional information that is specific to the current
        game state.
    */
    
    function argPlayCard(){
        $tableCardsCount = $this->tableManager->getTableCardsCount();
        $maxPlayableCardCount = $tableCardsCount + 1;
        $canPassTurn = ($tableCardsCount > 0);
        $activePlayerID = $this->getActivePlayerId();

        $args = [
            'textPlayerID' => $activePlayerID,
            'playerYou' => $activePlayerID,
            'tableCardsCount' => $tableCardsCount,
            'maxPlayableCardCount' => $maxPlayableCardCount,
            'canPassTurn' => $canPassTurn
        ];

        return $args;
    }

    function argTakeCard(){ 
        $wasOnTableCards = $this->tableManager->getCardsWasOnTable();
        if(isset($wasOnTableCards['tableCards']))
            $wasOnTableCards = $wasOnTableCards['tableCards'];
        else $wasOnTableCards = [];

        $activePlayerID = $this->getActivePlayerId();

        return [ 'textPlayerID' => $activePlayerID, 'playerYou' => $activePlayerID, 'CARD_ICONS' => $wasOnTableCards];
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    function stNewHand(){
        self::incStat(1, "table_total_hand_count");
        self::incStat(1, "table_total_round_count");
        $this->tableManager->shuffleAndDealCards();

        $this->notifyAllPlayers('handStarted', clienttranslate('New hand begins!'), array('handSize' => HAND_SIZE, 'NEW_HAND_LOG_ROW' => true, 'preserve' => ['NEW_HAND_LOG_ROW']));

        $playerIDs = self::getCollectionFromDb("SELECT player_id FROM player ", true);
        foreach($playerIDs as $nextPlayerID => $value){
            $playerHand = $this->handManager->getPlayerHand($nextPlayerID);
            $this->notifyPlayer($nextPlayerID, 'handDealt', '', array('myHand' => $playerHand));
        }

        $lastHandOpenerPlayerID = $this->globalsManager->get('last_hand_opener_player_id');
        if($lastHandOpenerPlayerID){ //first turn of the game
            $nextPlayerTable = self::getNextPlayerTable();
            $newHandOpenerPlayerID = $nextPlayerTable[$lastHandOpenerPlayerID];
            self::incStat(1, "player_turn_count", $nextPlayerID);
        } else $newHandOpenerPlayerID = $this->getCurrentPlayerId();

        $this->globalsManager->set('last_hand_opener_player_id', $newHandOpenerPlayerID);
        $this->gamestate->changeActivePlayer($newHandOpenerPlayerID);
        
        $this->gamestate->nextState('playCard');
    }

    function stNewRound(){
        self::DbQuery("UPDATE cards SET card_location = 'discarded', card_location_arg = 0 WHERE card_location = 'on_table'");
        self::incStat(1, "table_total_round_count");
        
        $this->notifyAllPlayers('roundEnded', clienttranslate('New round begins!'), ["NEW_ROUND_LOG_ROW" => true, 'preserve' => ['NEW_ROUND_LOG_ROW']]);

        $this->gamestate->nextState('playCard');
        $this->autoPlayCardsIfNeeded();
    }

    function stNextPlayer(){
        $nextPlayerID = self::activeNextPlayer();

        self::giveExtraTime($nextPlayerID);
        self::incStat(1, "player_turn_count", $nextPlayerID);
        
        $lastPlayedCardsOwnerID = (int) $this->getUniqueValueFromDB("SELECT card_location_arg AS player_id FROM cards WHERE card_location = 'on_table' LIMIT 1");
        if($lastPlayedCardsOwnerID == $nextPlayerID){
            $this->gamestate->nextState('newRound'); 
            return;
        }

        $tableCardsCount = $this->tableManager->getTableCardsCount();
        $handCount = $this->handManager->getPlayerHandCount($nextPlayerID);

        $this->gamestate->nextState('playCard');
        $this->autoPlayCardsIfNeeded();
    }

    function switchToTakeCard(){
        $cardsCountToPickFrom = $this->tableManager->getWasTableCardsCount();

        if($cardsCountToPickFrom <= 0){
            $this->gamestate->nextState( "nextPlayer" );
            return;
        } 

        $this->gamestate->nextState('takeCard');

        if($cardsCountToPickFrom == 1){
            $wasOnTableCards = $this->tableManager->getCardsWasOnTable();
            $wasOnTableCards = $wasOnTableCards['tableCards'][0];
            $this->handManager->takeCardFromTableToHand($wasOnTableCards['card_id'], true);
        }
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Zombie
////////////

    /*
        zombieTurn:
        
        This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
        You can do whatever you want in order to make sure the turn of this player ends appropriately
        (ex: pass).
        
        Important: your zombie code will be called when the player leaves the game. This action is triggered
        from the main site and propagated to the gameserver from a server, not from a browser.
        As a consequence, there is no current player associated to this action. In your zombieTurn function,
        you must _never_ use getCurrentPlayerId() or getCurrentPlayerName(), otherwise it will fail with a "Not logged" error message. 
    */

    function zombieTurn( $state, $active_player ): void
    {
    	$statename = $state['name'];
    	
        if ($state['type'] === "activeplayer") {
            switch ($statename) {
                case 'takeCard':
                    $wasOnTableCards = $this->tableManager->getCardsWasOnTable();
                    if(isset($wasOnTableCards['tableCards']))
                        $this->handManager->takeCardFromTableToHand($wasOnTableCards['tableCards'][0]['card_id'], false, $active_player);
                    $this->gamestate->nextState('zombiePass');
                    break;

                default:
                    $this->gamestate->nextState( "zombiePass" );
                	break;
            }

            return;
        }

        if ($state['type'] === "multipleactiveplayer") {
            // Make sure player is in a non blocking status for role turn
            $this->gamestate->setPlayerNonMultiactive( $active_player, '' );
            
            return;
        }

        throw new feException( "Zombie mode not supported at this game state: ".$statename );
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Debug functions
////////////

    function message($txt, $desc = '', $color = 'blue')
    {
        if ($this->getBgaEnvironment() != "studio")
            return;

        if (is_array($txt))
            $txt = json_encode($txt);

        if($desc != '')
            $txt .= "   ".json_encode($desc);

        self::trace("Logging: <span style='color: $color;'>$txt</span>");
        self::notifyAllPlayers('plop',"<textarea style='height: 104px; width: 230px;color:$color'>$txt</textarea>",array());
    }
    
///////////////////////////////////////////////////////////////////////////////////:
////////// DB upgrade
//////////

    /*
        upgradeTableDb:
        
        You don't have to care about this until your game has been published on BGA.
        Once your game is on BGA, this method is called everytime the system detects a game running with your old
        Database scheme.
        In this case, if you change your Database scheme, you just have to apply the needed changes in order to
        update the game database and allow the game to continue to run with your new version.
    
    */
    
    function upgradeTableDb( $from_version )
    {
        // $from_version is the current version of this game database, in numerical form.
        // For example, if the game was running with a release of your game named "140430-1345",
        // $from_version is equal to 1404301345
        
        // Example:
//        if( $from_version <= 1404301345 )
//        {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "ALTER TABLE DBPREFIX_xxxxxxx ....";
//            $this->applyDbUpgradeToAllDB( $sql );
//        }
//        if( $from_version <= 1405061421 )
//        {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "CREATE TABLE DBPREFIX_xxxxxxx ....";
//            $this->applyDbUpgradeToAllDB( $sql );
//        }
//        // Please add your future database scheme changes here
//
//


    }    
}
