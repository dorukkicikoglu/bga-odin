/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * odin implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * odin.js
 *
 * odin user interface script
 * 
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

define([
    "dojo","dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter",
    g_gamethemeurl + "modules/js/ODNAnimationHandler.js",
    g_gamethemeurl + "modules/js/ODNPlayerHandler.js",
    g_gamethemeurl + "modules/js/ODNHandHandler.js",
    g_gamethemeurl + "modules/js/ODNTableHandler.js",
    g_gamethemeurl + "modules/js/ODNPrefHandler.js",
    g_gamethemeurl + "modules/js/ODNBackgroundHandler.js",
    g_gamethemeurl + "modules/js/ODNImageLoadHandler.js"
],
function (dojo, declare) {
    return declare("bgagame.odin", ebg.core.gamegui, {
        constructor: function(){
            console.log('odin constructor');

            this.players = {};
            this.myself = null;
            this.animationHandler = null;
            this.tableHandler = null;
            this.prefHandler = null;
            this.backgroundHandler = null;
            this.GOAT_SUIT = null;

            this.imageLoader = new bgagame.ImageLoadHandler(this, ['odin-cards', 'bg-odin', 'bg-front']);
        },

        setup: function( gamedatas )
        {
            console.log( "Starting game setup" );
            
            this.GOAT_SUIT = gamedatas.GOAT_SUIT;

            this.animationHandler = new bgagame.AnimationHandler(this);
            this.prefHandler = new bgagame.PrefHandler(this, gamedatas.pref_names);
 
            dojo.query('.my-hand-container .my-hand-title')[0].innerHTML = _('Your hand');
            
            for( var player_id in gamedatas.players )
            {
                const {name, color, player_no, handCount} = this.gamedatas.players[player_id];
                this.players[player_id] = new bgagame.PlayerHandler(this, player_id, name, color, parseInt(player_no), parseInt(handCount));
            }
            
            if(this.players.hasOwnProperty(this.player_id)){
                this.myself = this.players[this.player_id];
                this.myself.setHand(gamedatas.my_hand, this.gamedatas.sort_cards_by);
            
                document.documentElement.style.setProperty('--player-color', '#' + this.myself.playerColor);
            } else {
                dojo.query('.my-hand-container')[0].style.display = 'none';
            }

            this.tableHandler = new bgagame.TableHandler(this, this.gamedatas.tableCards, this.gamedatas.prevSet);
            this.backgroundHandler = new bgagame.BackgroundHandler(this, gamedatas.GOAT_ENABLED);

            this.addGoatCardTooltip();

            this.observeLogs();

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            console.log( "Ending game setup" );
        },
       

        ///////////////////////////////////////////////////
        //// Game & client states
        
        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function( stateName, args )
        {
            console.log( 'Entering state: '+stateName );

            switch( stateName )
            {
                case 'playCard':
                    if (!args.args.canPassTurn) {
                        if(this.isCurrentPlayerActive()){
                            this.gamedatas.gamestate.description = _('${playerYou} must play a card');
                            this.gamedatas.gamestate.descriptionmyturn = _('${playerYou} must play a card');
                        } else {
                            this.gamedatas.gamestate.description = _('${textPlayerID} must play a card');
                            this.gamedatas.gamestate.descriptionmyturn = _('${textPlayerID} must play a card');
                        }
                        this.updatePageTitle();
                    } else if(this.isCurrentPlayerActive()){
                        var desc = this.myself.hand.canPlayHigher() ? _('${playerYou} may play ${tableCardsCount}-${maxPlayableCardCount} cards') : dojo.string.substitute(_('${playerYou} cannot beat ${cardIcons}'), {playerYou: this.divYou(), cardIcons: this.createCardIcons(this.tableHandler.tableCards)});

                        this.gamedatas.gamestate.description = desc;
                        this.gamedatas.gamestate.descriptionmyturn = desc;

                        this.updatePageTitle();
                    }

                    if(this.myself)
                        this.myself.hand.setPlayableCardCounts(args.args.tableCardsCount, args.args.maxPlayableCardCount);
                break;
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function( stateName )
        {
            console.log( 'Leaving state: '+stateName );

            switch( stateName )
            {
                case 'takeCard':
                    if(this.myself)
                        this.myself.hand.setHandCountAttrForMobileResizing();
                break;
            }
        }, 

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //        
        onUpdateActionButtons: function( stateName, args )
        {
            console.log( 'onUpdateActionButtons: '+stateName );
                      
            if( this.isCurrentPlayerActive() )
            {            
                switch( stateName )
                {
                    case 'playCard':
                        var titleContainer = $('pagemaintitletext');
                        titleContainer.innerHTML = '<span class="play-card-menu"><span class="status-text">' + titleContainer.innerHTML + '</span><span class="selected-cards-container"></span></span>';

                        if(args.canPassTurn){
                            var playCardMenu = dojo.query('.play-card-menu', titleContainer)[0];
                            playCardMenu.querySelectorAll('.pass-play-button').forEach(button => { button.remove(); });
                            playCardMenu.innerHTML += '<a class="pass-play-button odn-yellow-button bgabutton">' + _('Pass') + '</a>';
                            // playCardMenu.innerHTML += '<a class="pass-play-button odn-yellow-button bgabutton ikincisi">' + _('Pass') + '</a>'; //lahmacun sil
                            dojo.attr(playCardMenu, 'has-selected-cards', 'false');

                            dojo.query('.pass-play-button', titleContainer).connect('onclick', this, () => { this.myself.hand.passTurn(); });

                            if(!this.myself.hand.canPlayHigher())
                                this.setAutoClick(dojo.query('#page-title .pass-play-button')[0]);
                            // if(!this.myself.hand.canPlayHigher()) //lahmacun sil
                            //     this.setAutoClick(dojo.query('#page-title .pass-play-button')[1], 12000, 0, 'auto-pass');
                        }
                    break;
                }
            }

            switch( stateName )
            {
                case 'takeCard':
                    if(args['CARD_ICONS'].length == 0)
                        $('pagemaintitletext').innerHTML = _('Updating game situation...');
                    else if(args['CARD_ICONS'].length > 1){
                        if(!this.isCurrentPlayerActive()){
                            $('pagemaintitletext').innerHTML = dojo.string.substitute(_('${textPlayerID} must choose a card to keep'), {textPlayerID: this.divColoredPlayer(args.textPlayerID)});
                            return;
                        }
                        
                        $('pagemaintitletext').innerHTML = dojo.string.substitute(_('${playerYou} must choose a card to keep'), {playerYou: this.divYou()});

                        $('pagemaintitletext').innerHTML += (':<div class="mobile-visible mobile-icons-seperator"></div>' + this.createCardIcons(args['CARD_ICONS']));

                        var cardButtons = dojo.query('#page-title .a-card-icon');

                        cardButtons.forEach((cardButton) => {
                            dojo.addClass(cardButton, 'a-button-card-icon');
                            dojo.connect(cardButton, 'onclick', (event) => {
                                var cardID = parseInt(dojo.attr(event.target, 'card-id'));
                                this.myself.hand.cardSelectedToKeep(cardID);
                            });
                        });
                    }
                break;
            }
        },

        ///////////////////////////////////////////////////
        //// Utility methods
        
        /*
        
            Here, you can defines some utility methods that you can use everywhere in your javascript
            script.
        
        */

        /** Override this function to inject html into log items. This is a built-in BGA method.  */
        /* @Override */
        format_string_recursive: function format_string_recursive(log, args) {
            try {
                if (log && args && !args.processed) {
                    args.processed = true;

                    // list of special keys we want to replace with images
                    var keys = ['textPlayerID', 'playerYou', 'CARD_ICONS_STR', 'SCORE_ICON', 'NEW_ROUND_LOG_ROW', 'NEW_HAND_LOG_ROW', 'ARROW_RIGHT', 'ARROW_LEFT', 'CARD_ICONS']; //to do: remove CARD_ICONS some time after 27 Nov 24
                    for(var key of keys) {
                        if(key in args) {
                            if(key == 'textPlayerID')
                                args['textPlayerID'] = this.divColoredPlayer(args['textPlayerID']);
                            else if(key == 'playerYou' && args.hasOwnProperty('playerYou'))
                                args['playerYou'] = this.divColoredPlayer(args['playerYou']);
                            else if(key == 'CARD_ICONS_STR' && args.hasOwnProperty('CARD_ICONS'))
                                args['CARD_ICONS_STR'] = this.createCardIcons(args['CARD_ICONS']);
                            else if(key == 'CARD_ICONS')
                                args['CARD_ICONS'] = this.createCardIcons(args['CARD_ICONS']);
                            else if(key == 'SCORE_ICON')
                                args['SCORE_ICON'] = '<i class="fa fa-star"></i>';
                            else if(key == 'NEW_ROUND_LOG_ROW')
                                log = _(log) + '<div class="round-log-row-child a-log-row-child"></div>';
                            else if(key == 'NEW_HAND_LOG_ROW')
                                log = _(log) + '<div class="hand-log-row-child a-log-row-child"></div>';
                            else if(key == 'ARROW_RIGHT')
                                args['ARROW_RIGHT'] = '<i class="log-arrow log-arrow-right fa6 fa-arrow-right"></i>';
                            else if(key == 'ARROW_LEFT')
                                args['ARROW_LEFT'] = '<i class="log-arrow log-arrow-left fa6 fa-angle-double-left"></i>';
                        }
                    }
                }
            } catch (e) {
                console.error(log,args,"Exception thrown", e.stack);
            }
            return this.inherited({callee: format_string_recursive}, arguments);
        },

        getPos: function(node) { var pos = this.getBoundingClientRectIgnoreZoom(node); pos.w = pos.width; pos.h = pos.height; return pos; },

        observeLogs: function(){
            var observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1 && node.tagName.toLowerCase() === 'div' && node.classList.contains('log')){
                                if(dojo.query('.hand-log-row-child', node).length > 0){
                                    this.removeNBSPFromMobileLog(node);
                                    dojo.addClass(node, 'new-hand-log');
                                    dojo.attr(node, 'first-new-hand-long', Array.from(node.parentNode.children).some(sibling => sibling !== node && sibling.classList.contains("new-hand-log")) ? 'false' : 'true'); //the first new-hand-long will have no margin-top or margin-bottom
                                } else if(dojo.query('.round-log-row-child', node).length > 0){
                                    this.removeNBSPFromMobileLog(node);
                                    dojo.addClass(node, 'new-round-log');
                                }
                                else if(dojo.query('.log-arrow-left', node).length > 0)
                                    dojo.addClass(node, 'take-card-log');   
                                else if(dojo.query('.log-arrow-right', node).length > 0)
                                    dojo.addClass(node, 'play-cards-log');   


                                if(this.isDesktop() && dojo.hasClass(node, 'log_replayable')){
                                    var timestamp = dojo.query('.timestamp', node);
                                    if(timestamp.length > 0){
                                        this.observeLogs.nextTimestampValue = timestamp[0].innerText;
                                    } else if(this.observeLogs.hasOwnProperty('nextTimestampValue')){
                                        var newTimestamp = dojo.create('div', {class: 'timestamp'});
                                        newTimestamp.innerHTML = this.observeLogs.nextTimestampValue;
                                        dojo.place(newTimestamp, node);
                                    }
                                }
                            }
                        });
                    }
                });
            });

            // Configure the MutationObserver to observe changes to the container's child nodes
            var config = {
                childList: true,
                subtree: true // Set to true if you want to observe all descendants of the container
            };

            // Start observing the container
            observer.observe($('logs'), config);
            observer.observe($('chatbar'), config); //mobile notifs
        },

        removeNBSPFromMobileLog: function(node){ dojo.query('.roundedboxinner', node).forEach((mobileInnerDiv) => { mobileInnerDiv.innerHTML = mobileInnerDiv.innerHTML.replaceAll('&nbsp;', ''); }); },

        createCardIcons: function(cardIconsData){
            var html = '';

            if(Array.isArray(cardIconsData)) {
                for(let iconData of cardIconsData)
                    html += this.format_block('jstpl_card_icon', {card_id: iconData.card_id, suit: iconData.suit, rank: iconData.rank})
            } else {
                for(let key in cardIconsData)
                    html += this.format_block('jstpl_card_icon', {card_id: cardIconsData[key].card_id, suit: cardIconsData[key].suit, rank: cardIconsData[key].rank})
            }
            return html;
        },

        cloneCard: function(cardToClone){
            var cardClone = dojo.clone(cardToClone);
            var cardWidth = getComputedStyle(cardToClone).getPropertyValue('--card-width').trim();

            cardClone.style.setProperty('--card-width', cardWidth);
            dojo.style(cardClone, 'position', 'absolute');
            dojo.addClass(cardClone, 'a-card-clone');

            return cardClone;
        },

        getCardsStrength(inputArr = false){
            if(inputArr.length <= 0)
                return 0;

            var nums = [];

            for(var key in inputArr)
                nums.push(parseInt(inputArr[key].rank));
            nums.sort((a, b) => { return b - a; });
            nums = parseInt(nums.join(''))

            return nums;
        },

        addGoatCardTooltip(){
            let goatCard = dojo.query('.a-card[suit=' + this.GOAT_SUIT + ']', this.cardsContainer);
            if(goatCard.length <= 0)
                return;

            goatCard = goatCard[0];

            dojo.attr(goatCard, 'id', 'goat-card');
            
            let goatTooltipHTML = bga_format(_('*GRUMPY GOAT*\
                    £The Grumpy Goat is a joker card and stands for the number 0 in any color. If you start with the Grumpy Goat, the value stands at 0. When you play multiple cards, the Grumpy Goat must be in the %last position%.£\
                    €^Example:^ If you play 2 and 7 of the same color and you use the Grumpy Goat, the value of your set is 720.€\
                    $If you have the Grumpy Goat in your hand at the end of a hand, you lose 5 points.$\
            '), {
                '*': (t) => '<div style="text-align: center; font-size: 16px;"><div style="text-align: center; font-weight: bold; font-size: 18px;">' + t + '</div>',
                '£': (t) => '<br><p>' + t + '</p>',
                '%': (t) => '<u>' + t + '</u>',
                '^': (t) => '<strong>' + t + '</strong>',
                '€': (t) => '<br><p>' + t + '</p>',
                '$': (t) => '<br><p>' + t + '</p></div>'
            });

            this.addTooltipHtml('goat-card', goatTooltipHTML);
        },

        /* Implementation of proper colored You with background in case of white or light colors  */
 
        divYou: function(attributes = {}) {
            var color = this.gamedatas.players[this.player_id].color;
            var color_bg = "";
            if (this.gamedatas.players[this.player_id] && this.gamedatas.players[this.player_id].color_back) {
                color_bg = "background-color:#" + this.gamedatas.players[this.player_id.toString()].color_back + ";";
            }
            var html = "<span style=\"font-weight:bold;color:#" + color + ";" + color_bg + "\" " + this.getAttributesHTML(attributes) + ">" + __("lang_mainsite", "You") + "</span>";
            return html;
        },

        /* Implementation of proper colored player name with background in case of white or light colors  */

        divColoredPlayer: function(player_id, attributes = {}, detectYou = true) {
            if(detectYou && parseInt(player_id) === parseInt(this.player_id))
                return this.divYou(attributes);

            player_id = player_id.toString();

            var color = this.gamedatas.players[player_id].color;
            var color_bg = "";
            if (this.gamedatas.players[player_id] && this.gamedatas.players[player_id].color_back) {
                color_bg = "background-color:#" + this.gamedatas.players[player_id].color_back + ";";
            }
            var html = "<span style=\"color:#" + color + ";" + color_bg + "\" " + this.getAttributesHTML(attributes) + ">" + this.gamedatas.players[player_id].name + "</span>";
            return html;
        },
        getAttributesHTML: function(attributes){ return Object.entries(attributes || {}).map(([key, value]) => `${key}="${value}"`).join(' '); },

        isDesktop: function () { return dojo.hasClass(dojo.body(), 'desktop_version'); },
        isMobile: function () { return dojo.hasClass(dojo.body(), 'mobile_version'); },

        updateStatusText: function(statusText){ dojo.query('#page-title #pagemaintitletext')[0].innerHTML = statusText; },
        
        /**
         * Sets up auto-click functionality for a button after a timeout period
         * @param button - The button HTML element to auto-click
         * @param timeoutDuration - Base duration in ms before auto-click occurs (default: 5000)
         * @param randomIncrement - Optional random additional ms to add to timeout (default: 2000)
         * @param autoClickID - Optional ID for the auto-click events, multiple buttons can therefore point to the same autoClick event
         * @param onAnimationEnd - Optional callback that returns boolean to control if click should occur (default: true)
         */
        setAutoClick: function(button, timeoutDuration = 5000, randomIncrement = 2000, autoClickID = null, onAnimationEnd = () => true) {
            const totalDuration = timeoutDuration + Math.random() * randomIncrement;
            this.setAutoClick.timeouts = this.setAutoClick.timeouts || {};
            
            if(!autoClickID){
                this.setAutoClick.autoClickIncrement = this.setAutoClick.autoClickIncrement || 1;
                autoClickID = 'auto-click-' + this.setAutoClick.autoClickIncrement++;
            }
            this.setAutoClick.timeouts[autoClickID] = this.setAutoClick.timeouts[autoClickID] || [];

            button.style.setProperty('--bga-autoclick-timeout-duration', `${totalDuration}ms`);
            button.classList.add('bga-autoclick-button');

            const stopDoubleTrigger = () => {
                if(!this.setAutoClick.timeouts[autoClickID]) return;
                this.setAutoClick.timeouts[autoClickID].forEach(timeout => clearTimeout(timeout));
                delete this.setAutoClick.timeouts[autoClickID];
            }
            button.addEventListener('click', stopDoubleTrigger, true);
               
            this.setAutoClick.timeouts[autoClickID].push(
                setTimeout(() => {
                    stopDoubleTrigger();
                    if (!document.body.contains(button)) return;
                    const customEventResult = onAnimationEnd();
                    if (customEventResult) button.click();
                }, totalDuration)
            );
        },

        showTopBarTooltip(message, className = '', destroyTimeOut = false){
            const tooltip = new dijit.TooltipDialog({
                content: message,
                class: 'a-top-bar-tooltip ' + className
            });

            dijit.popup.open({
                popup: tooltip,
                around: dojo.byId('ingame_menu_wheel')
            });

            dojo.byId('topbar').appendChild(tooltip.domNode.parentNode); // Reparent the popup for z-index control

            if(destroyTimeOut)
                setTimeout(() => { dijit.popup.close(tooltip); tooltip.destroy(); }, destroyTimeOut);
        },

        closeConfirmationDialog(){ dojo.query('.standard_popin, .standard_popin_underlay').forEach(dojo.destroy); },

        printDebug:function(...args){ args[0] = typeof args[0] == 'string' ? '*** ' + args[0] : args[0]; console.log(...args); },
        
        ///////////////////////////////////////////////////
        //// Player's action
        
        /*
        
            Here, you are defining methods to handle player's action (ex: results of mouse click on 
            game objects).
            
            Most of the time, these methods:
            _ check the action is possible at this game state.
            _ make a call to the game server
        
        */

        ajaxcallwrapper: function(action, args = {}, lock = true, checkAction = true, handler) {            
            args.version = this.gamedatas.version;
            this.bgaPerformAction(action, args, { lock: lock, checkAction: checkAction });
        },

        isViewOnly() {
            return this.isSpectator || typeof g_replayFrom != 'undefined' || g_archive_mode;
        },
        
        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications

        /*
            setupNotifications:
            
            In this method, you associate each of your game notifications with your local method to handle it.
            
            Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                  your odin.game.php file.
        
        */
        setupNotifications: function()
        {
            console.log( 'notifications subscriptions setup' );
            
            dojo.subscribe('cardsPlayed', this, "notif_cardsPlayed");
            dojo.subscribe('turnPassed', this, "notif_turnPassed");
            dojo.subscribe('cardTakenFromTable', this, "notif_cardTakenFromTable");
            dojo.subscribe('newScores', this, "notif_newScores");
            dojo.subscribe('roundEnded', this, "notif_roundEnded");
            dojo.subscribe('handStarted', this, "notif_handStarted");
            dojo.subscribe('handDealt', this, "notif_handDealt");

            const synchronousEvents = ['cardsPlayed', 'turnPassed', 'cardTakenFromTable', 'handStarted'];
            synchronousEvents.forEach(event => { this.notifqueue.setSynchronous(event); });
        },

        releaseNotification(){ this.notifqueue.setSynchronousDuration(0); },

        notif_cardsPlayed: function(notif)
        {
            console.log('notif_cardsPlayed');
            console.log(notif);

            if(this.players.hasOwnProperty(notif.args.cardsOwnerID))
                this.players[notif.args.cardsOwnerID].setHandCount(notif.args.handCount);

            if(notif.args.shouldEndHand){
                var statusBarArgs = {CARD_ICONS: notif.args.CARD_ICONS};
                var playerFieldName = this.player_id.toString() == notif.args.cardsOwnerID.toString() ? 'playerYou' : 'playerName';
                statusBarArgs[playerFieldName] = this.divColoredPlayer(notif.args.cardsOwnerID);

                var statusText = dojo.string.substitute(playerFieldName == 'playerYou' ? _('${playerYou} cleared hand with ${CARD_ICONS}') : _('${playerName} cleared hand with ${CARD_ICONS}'), statusBarArgs);
                $('gameaction_status').innerHTML = statusText;
                this.updateStatusText(statusText);

                this.tableHandler.moveCardsOffTable();
            } else this.tableHandler.moveExistingCardsDown(notif.args.played_cards.length);

            var onAnimationEnd = notif.args.shouldEndHand ?
                () => { setTimeout(() => { this.releaseNotification(); }, 1400); } :
                () => { this.releaseNotification(); };

            this.tableHandler.moveCardsToTable(notif.args.cardsOwnerID, notif.args.played_cards, onAnimationEnd);
        },
        
        notif_turnPassed(notif)
        {
            console.log('notif_turnPassed');
            console.log(notif);

            var statusBarArgs = {};
            var playerFieldName = this.player_id.toString() == notif.args.passingPlayerID.toString() ? 'playerYou' : 'playerName';
            statusBarArgs[playerFieldName] = this.divColoredPlayer(notif.args.passingPlayerID);

            var statusText = dojo.string.substitute(
                playerFieldName == 'playerYou' ? 
                    (notif.args.autoPass ? _('${playerYou} auto-passed') : _('${playerYou} passed')):
                    (notif.args.autoPass ? _('${playerName} auto-passed') : _('${playerName} passed')),
                statusBarArgs);
            $('gameaction_status').innerHTML = statusText;
            this.updateStatusText(statusText);
            document.title = $('gameaction_status').innerText;

            setTimeout(() => { this.releaseNotification(); }, 1400);
        },

        notif_cardTakenFromTable: function(notif)
        {
            console.log('notif_cardTakenFromTable');
            console.log(notif);

            var playerNameDiv = this.divColoredPlayer(notif.args.cardsOwnerID);
            var statusText = dojo.string.substitute((this.isCurrentPlayerActive() ? _('${playerYou} are taking ${CARD_ICONS}') : _('${textPlayerID} is taking ${CARD_ICONS}')), { playerYou: playerNameDiv, textPlayerID: playerNameDiv, CARD_ICONS: notif.args['CARD_ICONS'] } );

            $('pagemaintitletext').innerHTML = statusText;
            $('gameaction_status').innerHTML = statusText;

            if(this.players.hasOwnProperty(notif.args.cardsOwnerID))
                this.players[notif.args.cardsOwnerID].setHandCount(notif.args.handCount);

            this.players[notif.args.cardsOwnerID].takeCard(notif.args.taken_card);
        },

        notif_newScores: function(notif)
        {
            console.log('notif_newScores');
            console.log(notif);

            for(var player_id in notif.args.newScores)
                this.scoreCtrl[player_id].toValue(notif.args.newScores[ player_id ]);
        },
        
        notif_roundEnded: function(notif)
        {
            console.log('notif_roundEnded');
            console.log(notif);

            this.tableHandler.moveCardsOffTable();
        },
        
        notif_handStarted: function(notif)
        {
            console.log('notif_handStarted');
            console.log(notif);

            this.updateStatusText(_('New hand starting...'));

            for(var player_id in this.players)
                this.players[player_id].setHandCount(notif.args.handSize);

            var onAnimationEnd = () => { this.releaseNotification(); };

            this.tableHandler.moveCardsOffTable();
            if(this.myself)
                this.myself.hand.moveCardsOffHand(onAnimationEnd);
            else onAnimationEnd();
        },
        
        notif_handDealt: function(notif)
        {
            console.log('notif_handDealt');
            console.log(notif);

            setTimeout(() => {
                this.myself.hand.dealMeCards(notif.args.myHand);
            }, 200);
        }
   });
});
