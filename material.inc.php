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
        1 => ['name' => 'BLUE', 'colorCode' => '357abf'],
        2 => ['name' => 'RED', 'colorCode' => 'a80728'],
        3 => ['name' => 'PINK', 'colorCode' => 'f574ad'],
        4 => ['name' => 'GREEN', 'colorCode' => '4abd72'],
        5 => ['name' => 'BLACK', 'colorCode' => '463231'],
        6 => ['name' => 'ORANGE', 'colorCode' => 'ed8127']
    ]);

    define("ONE_HAND_GAME_SPECIAL_VALUE", 99);
    define("AUTO_FINISH_HAND_ON", 1);
}