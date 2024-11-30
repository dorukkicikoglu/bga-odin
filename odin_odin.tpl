{OVERALL_GAME_HEADER}

<!-- 
--------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- odin implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-------

    odin_odin.tpl
    
    This is the HTML template of your game.
    
    Everything you are writing in this file will be displayed in the HTML page of your game user interface,
    in the "main game zone" of the screen.
    
    You can use in this template:
    _ variables, with the format {MY_VARIABLE_ELEMENT}.
    _ HTML block, with the BEGIN/END format
    
    See your "view" PHP file to check how to set variables and control blocks
    
    Please REMOVE this comment before publishing your game on BGA
-->

<div class="my-hand-container">
    <div class="my-hand-title"></div>
    <div class="cards-container"></div>
    <a class="bgabutton order-cards-button bgabutton_gray bgabutton_small"></a>
</div>

<div class="table-container">
    <div class="table-owner-name-container">&nbsp;</div>
    <div class="cards-container"></div>
    <div class="prev-set-container"></div>
</div>

<script type="text/javascript">

// Javascript HTML templates

var jstpl_card_icon='<div class="a-card-icon" suit="${suit}" rank="${rank}" card-id="${card_id}"></div>';
var jstpl_background_container='<div class="background-container"><div class="bg-captain"></div><div class="bg-front"></div><div class="bg-berserker has-shadow bg-breathing bg-breathing-1"></div><div class="bg-jarl has-shadow bg-breathing bg-breathing-2"></div></div>';

</script>  

{OVERALL_GAME_FOOTER}
