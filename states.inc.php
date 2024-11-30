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
 * states.inc.php
 *
 * odin game states description
 *
 */

/*
   Game state machine is a tool used to facilitate game developpement by doing common stuff that can be set up
   in a very easy way from this configuration file.

   Please check the BGA Studio presentation about game state to understand this, and associated documentation.

   Summary:

   States types:
   _ activeplayer: in this type of state, we expect some action from the active player.
   _ multipleactiveplayer: in this type of state, we expect some action from multiple players (the active players)
   _ game: this is an intermediary state where we don't expect any actions from players. Your game logic must decide what is the next game state.
   _ manager: special type for initial and final state

   Arguments of game states:
   _ name: the name of the GameState, in order you can recognize it on your own code.
   _ description: the description of the current game state is always displayed in the action status bar on
                  the top of the game. Most of the time this is useless for game state with "game" type.
   _ descriptionmyturn: the description of the current game state when it's your turn.
   _ type: defines the type of game states (activeplayer / multipleactiveplayer / game / manager)
   _ action: name of the method to call when this game state become the current game state. Usually, the
             action method is prefixed by "st" (ex: "stMyGameStateName").
   _ possibleactions: array that specify possible player actions on this step. It allows you to use "checkAction"
                      method on both client side (Javacript: this.checkAction) and server side (PHP: $this->checkAction).
   _ transitions: the transitions are the possible paths to go from a game state to another. You must name
                  transitions in order to use transition names in "nextState" PHP method, and use IDs to
                  specify the next game state for each transition.
   _ args: name of the method to call to retrieve arguments for this gamestate. Arguments are sent to the
           client side to be used on "onEnteringState" or to set arguments in the gamestate description.
   _ updateGameProgression: when specified, the game progression is updated (=> call to your getGameProgression
                            method).
*/

//    !! It is not a good idea to modify this file when a game is running !!

 
$machinestates = array(

    // The initial state. Please do not modify.
    1 => array(
        "name" => "gameSetup",
        "description" => "",
        "type" => "manager",
        "action" => "stGameSetup",
        "transitions" => array( "" => 11 )
    ),
    
    // Note: ID=2 => your first state

    11 => array(
        "name" => "newHand",
        "description" => "",
        "type" => "game",
        "action" => "stNewHand",
        "updateGameProgression" => true,
        "transitions" => array( "playCard" => 20 )
    ),

    12 => array(
        "name" => "newRound",
        "description" => "",
        "type" => "game",
        "action" => "stNewRound",
        "transitions" => array( "playCard" => 20 )
    ),

    13 => array(
        "name" => "nextPlayer",
        "description" => "",
        "type" => "game",
        "action" => "stNextPlayer",
        "updateGameProgression" => true,
        "transitions" => array( "playCard" => 20, "newRound" => 12 )
    ),

    20 => array(
        "name" => "playCard",
        "description" => clienttranslate('${textPlayerID} may play ${tableCardsCount}-${maxPlayableCardCount} cards'),
        "descriptionmyturn" => clienttranslate('${textPlayerID} may play ${tableCardsCount}-${maxPlayableCardCount} cards'),
        "type" => "activeplayer",
        "args" => "argPlayCard",
        "possibleactions" => array("playCards", "passTurn"),
        "transitions" => array( "takeCard" => 21, "nextPlayer" => 13, "newHand" => 11, "zombiePass" => 13, "gameEnd" => 99 )
    ),

    21 => array(
        "name" => "takeCard",
        "description" => '',
        "descriptionmyturn" => '',
        "type" => "activeplayer",
        "args" => "argTakeCard",
        "possibleactions" => array("takeCardFromTableToHand"),
        "transitions" => array( "pass" => 2, "nextPlayer" => 13, "zombiePass" => 20)
    ),
    
    // Final state.
    // Please do not modify (and do not overload action/args methods).
    99 => array(
        "name" => "gameEnd",
        "description" => clienttranslate("End of game"),
        "type" => "manager",
        "action" => "stGameEnd",
        "args" => "argGameEnd"
    )

);



