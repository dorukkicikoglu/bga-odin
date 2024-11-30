define([
    "dojo",
    "dojo/_base/declare",
],
    function (dojo, declare) {
        var TableHandler = declare("bgagame.TableHandler", null, {
            constructor(gameui, tableCardsData, prevSet) {
            	this.gameui = gameui;
                this.tableCards = tableCardsData.hasOwnProperty('tableCards') ? tableCardsData.tableCards : [];
            	this.cardsOwnerID = tableCardsData.hasOwnProperty('cardsOwnerID') ? tableCardsData.cardsOwnerID : null;
                this.prevSet = prevSet;

                this.tableContainer = dojo.query('.table-container', 'page-content')[0];
                this.cardsContainer = dojo.query('.cards-container', this.tableContainer)[0];
                this.prevSetContainer = dojo.query('.prev-set-container', this.tableContainer)[0];

                this.nameContainer = dojo.query('.table-owner-name-container', this.tableContainer)[0];

                this.displayTableCards();
                this.displayTableCards(false);

                if(this.cardsOwnerID)
                    this.displayNameContainer();
                else this.hideNameContainer();
            },

            displayTableCards(displayTable = true){ //if false, filling prevSetContainer
                var cardsArr = displayTable ? this.tableCards : this.prevSet;
                var containerToFill = displayTable ? this.cardsContainer : this.prevSetContainer;

            	if(!cardsArr)
            		return;

                dojo.empty(containerToFill);

                for(cardData of cardsArr){
                    var aCard = dojo.create('div', {class: 'a-card game-area-card', suit: cardData.suit, rank: cardData.rank});
                    dojo.attr(aCard, 'card-id', cardData.card_id);
                    dojo.place(aCard, containerToFill);

                    if(!displayTable && this.gameui.isCurrentPlayerActive()){
                        dojo.connect(aCard, 'onclick', (event) => {
                            var cardID = parseInt(dojo.attr(event.target, 'card-id'));
                            this.gameui.myself.hand.cardSelectedToKeep(cardID);
                        });
                    }
                }

                if(!displayTable)
                    this.shiftRightPrevSetContainer();
            },

            displayNameContainer(){ 
                var playerName = this.gameui.divColoredPlayer(this.cardsOwnerID, {class: 'table-owner-player-name'});
                var isYou = this.gameui.player_id.toString() == this.cardsOwnerID.toString();
                var containerTextTemplate = isYou ? _('${playerYou} played:') : _('${playerName} played:');
                var containerTextValues = isYou ? {playerYou: playerName} : {playerName: playerName};

                this.nameContainer.innerHTML = dojo.string.substitute( containerTextTemplate, containerTextValues); 
                this.gameui.animationHandler.animateProperty({node: this.nameContainer, properties: {opacity: 1}, duration: 300}).play();
            },

            hideNameContainer(){ this.gameui.animationHandler.animateProperty({node: this.nameContainer, properties: {opacity: 0}, duration: 300, onEnd: () => { this.nameContainer.innerHTML = '&nbsp;'; }}).play(); },

            sortArrayOfCards(cardArr){
                cardArr.sort((a, b) => { // Sort cards by suit attribute, then rank desc
                    var diff = a.suit - b.suit;
                    if(diff != 0)
                        return diff;
                    return b.rank - a.rank;
                });
                return cardArr;
            },

            sortTableCardsByHandAppearance(cardArr){ //sort tableCards by their appearance in player hand
                var cardIDtoHandIndex = {};
                dojo.query('.my-hand-container .a-card').forEach((card, index) => {
                    cardIDtoHandIndex[parseInt(dojo.attr(card, 'card-id'))] = index;
                });

                for(cardData of cardArr){
                    var cardDiv = dojo.query('.my-hand-container .a-card[card-id=' + cardData.card_id + ']');
                    if(cardDiv.length > 0){
                        var cardID = parseInt(dojo.attr(cardDiv[0], 'card-id'));
                        cardData.handIndex = cardIDtoHandIndex[cardID];
                    } else cardData.handIndex = 0;
                }
                cardArr.sort((a, b) => { return a.handIndex - b.handIndex; });
                for(cardIndex in cardArr)
                    delete cardArr[cardIndex].handIndex;
                return cardArr;
            },

            moveCardsToTable(cardsOwnerID, playedCardsData, onAnimationEnd){
                playedCardsData = this.sortArrayOfCards(playedCardsData);
                playedCardsData = this.sortTableCardsByHandAppearance(playedCardsData);

                this.tableCards = playedCardsData;
                this.cardsOwnerID = cardsOwnerID;

                this.displayTableCards();

                dojo.style(this.nameContainer, 'opacity', 0);

                var slideAnimations = [];
                for(cardData of this.tableCards){
                    var cardDiv = dojo.query('.my-hand-container .a-card[card-id=' + cardData.card_id + ']');

                    if(cardDiv.length > 0){
                        var cardDivToKill = cardDiv[0];
                        var cardDiv = dojo.clone(cardDivToKill);

                        dojo.style(cardDivToKill, {opacity: 0});
                        dojo.style(cardDiv, {position: 'absolute'});
                        dojo.place(cardDiv, this.cardsContainer);
                        this.gameui.placeOnObject(cardDiv, cardDivToKill);

                        this.gameui.animationHandler.animateProperty({
                            node: cardDivToKill,
                            duration: 500, 
                            easing: 'sineInOut',
                            properties: {width: 0, marginLeft: 0},
                            onEnd: dojo.hitch(this, function(cardDivToKill){ dojo.destroy(cardDivToKill); }, cardDivToKill)
                        }).play();
                    } else {
                        cardDiv = dojo.create('div', {class: 'a-card game-area-card', suit: cardData.suit, rank: cardData.rank, style: 'position: absolute; z-index: 1;'});
                        dojo.attr(cardDiv, 'card-id', cardData.card_id);

                        var playerBoard = this.gameui.players[cardsOwnerID].overallPlayerBoard;
                        dojo.place(cardDiv, this.cardsContainer);
                        this.gameui.placeOnObject(cardDiv, playerBoard);
                    }

                    var goTo = dojo.query('.a-card[card-id=' + cardData.card_id + ']', this.cardsContainer)[0];
                    dojo.style(goTo, 'opacity', 0);

                    slideAnimations.push(this.gameui.animationHandler.animateOnObject({
                        node: cardDiv,
                        goTo: goTo,
                        duration: 500,
                        easing: 'sineInOut',
                        onEnd: dojo.hitch(this, function(cardDiv, goTo){
                            dojo.destroy(cardDiv);
                            goTo.style.opacity = null;
                        }, cardDiv, goTo)
                    }));
                }

                slideAnimations = dojo.fx.combine(slideAnimations);
                slideAnimations.onEnd = () => { 
                    this.displayNameContainer();
                    if(this.gameui.players[cardsOwnerID].hand){
                        this.gameui.players[cardsOwnerID].hand.selectedCards = {};
                        this.gameui.players[cardsOwnerID].hand.removeCardsFromHandData(playedCardsData);
                    }

                    onAnimationEnd();
                };
                slideAnimations.play();
            },

            moveExistingCardsDown(newCardLength){
                this.prevSet = [];
                while(this.tableCards.length > 0)
                    this.prevSet[this.tableCards.length - 1] = this.tableCards.pop();

                this.displayTableCards(false);

                this.shiftRightPrevSetContainer(newCardLength);
        
                var cardsToKill = [];
                var animations = [];
                dojo.query('.a-card', this.cardsContainer).forEach((cardDivToKill) => {
                    var cardClone = this.gameui.cloneCard(cardDivToKill);
                    dojo.addClass(cardClone, 'prev-on-table-card');
                    dojo.place(cardClone, this.prevSetContainer);
                    this.gameui.placeOnObject(cardClone, cardDivToKill);

                    cardsToKill.push(cardDivToKill); //cant kill yet to preserve card positions

                    var goTo = dojo.query('.a-card[card-id=' + dojo.attr(cardDivToKill, 'card-id') + ']', this.prevSetContainer)[0];
                    dojo.style(goTo, 'opacity', 0);

                    animations.push(this.gameui.animationHandler.animateOnObject({
                        node: cardClone,
                        goTo: goTo,
                        duration: 200,
                        easing: 'quadOut',
                        onEnd: dojo.hitch(this, function(cardClone, goTo){
                            dojo.destroy(cardClone);
                            goTo.style.opacity = null;
                        }, cardClone, goTo)
                    }));
                });

                animations = dojo.fx.combine(animations);
                animations.play();

                cardsToKill.forEach(dojo.destroy);
            },

            shiftRightPrevSetContainer(newCardLength = false){ //shift when same number of cards on both rows
                if(newCardLength === false)
                    newCardLength = this.tableCards.length;
                dojo.attr(this.prevSetContainer, 'shift-right', (newCardLength - this.prevSet.length) % 2 == 0 ? 'true' : 'false'); 
            },

            moveCardsOffTable(displayTable = true){
                var cardsToKill = [];
                var animations = [];

                dojo.query('.a-card', displayTable ? this.cardsContainer : this.prevSetContainer).forEach((cardDivToKill) => {
                    var cardClone = this.gameui.cloneCard(cardDivToKill);
                    dojo.place(cardClone, 'page-content');
                    this.gameui.placeOnObject(cardClone, cardDivToKill);

                    cardsToKill.push(cardDivToKill);

                    var left = dojo.style(cardClone, 'left');

                    animations.push(this.gameui.animationHandler.animateProperty({
                        node: cardClone, 
                        easing: 'quadOut', 
                        duration: 600, 
                        properties: {left: -2 * this.gameui.getPos(cardClone).w},
                        onEnd: dojo.hitch(this, function(cardDivToKill){ dojo.destroy(cardClone); }, cardClone)
                    }));
                });

                animations = dojo.fx.combine(animations);
                animations.play();

                cardsToKill.forEach(dojo.destroy);

                if(displayTable){
                    this.hideNameContainer();
                    this.tableCards = [];
                }
            }
        });
    });
