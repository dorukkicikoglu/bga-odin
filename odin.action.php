<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * odin implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 * 
 * odin.action.php
 *
 * odin main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *       
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/odin/odin/myAction.html", ...)
 *
 */
  
  class action_odin extends APP_GameAction
  { 
    // Constructor: please do not modify
   	public function __default()
  	{
  	    if( $this->isArg( 'notifwindow') )
  	    {
            $this->view = "common_notifwindow";
  	        $this->viewArgs['table'] = $this->getArg( "table", AT_posint, true );
  	    }
  	    else
  	    {
            $this->view = "odin_odin";
            $this->trace( "Complete reinitialization of board game" );
      }
  	} 
  	
    public function setSortCardsBy()
    {
        self::setAjaxMode();
        $isSuit = self::getArg("isSuit", AT_bool, true);
        $this->game->setSortCardsBy($isSuit);
        self::ajaxResponse();
    }

    public function playCards()
    {
        self::setAjaxMode();
        $cardIDs = self::getArg("cardIDs", AT_json, true);
        $this->game->tableManager->playCards($cardIDs);
        self::ajaxResponse();
    }

    public function passTurn()
    {
        self::setAjaxMode();
        $this->game->passTurn();
        self::ajaxResponse();
    }

    public function takeCardFromTableToHand()
    {
        self::setAjaxMode();
        $cardID = self::getArg("cardID", AT_posint, true);
        $this->game->handManager->takeCardFromTableToHand($cardID);
        self::ajaxResponse();
    }
  }
  