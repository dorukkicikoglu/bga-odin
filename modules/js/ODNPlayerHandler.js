define([
    "dojo",
    "dojo/_base/declare",
],
    function (dojo, declare) {
        var PlayerHandler = declare("bgagame.PlayerHandler", null, {
            constructor(gameui, playerID, playerName, playerColor, playerNo, playerHandCount) {
                Object.assign(this, {gameui, playerID, playerName, playerColor, playerNo});

                this.hand = null;
                this.overallPlayerBoard = $('overall_player_board_' + this.playerID);

                this.setHandCount(playerHandCount);
            },

            setHandCount(handCountIn){ 
                if(!handCountIn) 
                    handCountIn = 0; 

                this.playerHandCount = handCountIn; 
                this.showHandCount();
            },

            showHandCount(){
                var maxVisibleCards = 9;
                var handCountContainer = dojo.query('.hand-count-container', this.overallPlayerBoard);

                if(handCountContainer.length <= 0){
                    handCountContainer = dojo.create('div', {class: 'hand-count-container'});
                    dojo.place(handCountContainer, dojo.query('.player_score', this.overallPlayerBoard)[0], 'after');
                } else handCountContainer = handCountContainer[0];

                dojo.empty(handCountContainer);

                for (var i = 0; i < Math.min(maxVisibleCards, this.playerHandCount); i++) {
                    var aCardBack = dojo.create('div', {class: 'a-card-back'});
                    dojo.place(aCardBack, handCountContainer);
                }

                if(this.playerHandCount <= maxVisibleCards)
                    dojo.attr(handCountContainer, 'multiplier-visible', 'false');
                else {
                    dojo.attr(handCountContainer, 'multiplier-visible', 'true');
                    handCountContainer.style.setProperty('--card-count', '"' + this.playerHandCount + '"');
                }
            },

            setHand(handData, sortCardsBy){ this.hand = new bgagame.HandHandler(this.gameui, this, handData, sortCardsBy); },

            takeCard(cardData){
                var cardDivToKill = dojo.query('.a-card[card-id=' + cardData.card_id + ']')[0];

                var cardClone = this.gameui.cloneCard(cardDivToKill);
                
                dojo.style(cardDivToKill, 'opacity', 0);

                if(this.hand){
                    this.hand.takeCardToHand(cardData, cardClone, cardDivToKill);
                } else {
                    dojo.place(cardClone, this.overallPlayerBoard);
                    dojo.style(cardClone, 'z-index', 1);
                    this.gameui.placeOnObject(cardClone, cardDivToKill);
                    var goTo = this.overallPlayerBoard;

                    this.gameui.animationHandler.animateOnObject({
                        node: cardClone,
                        goTo: goTo,
                        duration: 500,
                        easing: 'sineInOut',
                        onEnd: () => {
                            this.gameui.tableHandler.moveCardsOffTable(false);
                            dojo.destroy(cardDivToKill);
                            this.gameui.animationHandler.fadeOutAndDestroy(cardClone);
                            setTimeout(() => { dojo.addClass(goTo, 'board-bounce'); }, 80);
                            setTimeout(() => { dojo.removeClass(goTo, 'board-bounce'); }, 430);

                            this.gameui.releaseNotification();
                        }
                    }).play();
                }
            }
        });
    });
