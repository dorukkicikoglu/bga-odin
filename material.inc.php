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
 * material.inc.php
 *
 * odin game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *   
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */


if (!defined('SUIT_COUNT')) { // guard since this included multiple times
    define("SUIT_COUNT", 6);
    define("HIGHEST_RANK", 9);
    define("HAND_SIZE", 9);

    define("SUIT_DATA", [
        1 => ['name' => 'BLUE', 'colorCode' => '#357abf'],
        2 => ['name' => 'RED', 'colorCode' => '#a80728'],
        3 => ['name' => 'PINK', 'colorCode' => '#f574ad'],
        4 => ['name' => 'GREEN', 'colorCode' => '#4abd72'],
        5 => ['name' => 'BLACK', 'colorCode' => '#463231'],
        6 => ['name' => 'ORANGE', 'colorCode' => '#ed8127'],
        7 => ['name' => 'GOAT', 'colorCode' => 'linear-gradient( 270deg, #5a2c1d 0%, #5a2c1d 20%, #e86f1b 20%, #e86f1b 40%, #e76ea5 40%, #e76ea5 60%, #3678c6 60%, #3678c6 80%, #65b042 80%, #65b042 100% )'],
    ]);

    define("ONE_HAND_GAME_SPECIAL_VALUE", 99);
    define("GOAT_SUIT", 7);
    define("GOAT_PENALTY", 4);//4 instead of 5 because -1 is already added for ending up in player's hand
    
    define("AUTO_FINISH_HAND_ON", 1);
}