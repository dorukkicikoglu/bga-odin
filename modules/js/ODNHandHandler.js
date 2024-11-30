define([
    "dojo",
    "dojo/_base/declare",
],
    function (dojo, declare) {
        var HandHandler = declare("bgagame.HandHandler", null, {
            constructor(gameui, owner, handData, sortCardsBy) {
                Object.assign(this, {gameui, owner, handData, sortCardsBy});

                this.handContainer = dojo.query('#game_play_area .my-hand-container')[0];
                this.cardsContainer = dojo.query('.cards-container', this.handContainer)[0];
                this.orderCardsButton = dojo.query('.order-cards-button', this.handContainer)[0];
                
                this.selectedCards = {};
                this.tableCardsCount = 0;
                this.maxPlayableCardCount = 0;

                dojo.connect(this.orderCardsButton, 'onclick', () => { this.orderCardsButtonClicked(); });
                dojo.connect(this.cardsContainer, 'onclick', (event) => { this.cardsContainerClicked(event); });

                if(this.owner.playerColor.toLowerCase() == 'ffffff')
                    this.orderCardsButton.style.setProperty('--player-color', '#000000');

                this.displayHand();
                this.reorderCards(false);
            },

            displayHand(){
                dojo.empty(this.cardsContainer);

                for(cardData of this.handData)
                    this.insertCardToHand(cardData, true);

                this.setHandCountAttrForMobileResizing(false);
            },

            orderCardsButtonClicked(){
                this.sortCardsBy = (this.sortCardsBy == 'suit' ? 'rank' : 'suit');
                this.gameui.ajaxcallwrapper('setSortCardsBy', {isSuit: this.sortCardsBy == 'suit'}, false, false);
                this.reorderCards(true);
            },

            reorderCards(doAnimate){
                var cards = dojo.query('.a-card', this.cardsContainer);

                if(doAnimate){
                    cards.forEach((card, index) => {
                        var cardClone = this.gameui.cloneCard(card);
                        dojo.place(cardClone, this.cardsContainer);
                        dojo.style(cardClone, 'margin', 0);
                        this.gameui.placeOnObject(cardClone, card);

                        card.style.opacity = 0;
                    });
                }

                var suitToStrength = this.getSuitToStrength();

                cards.sort((a, b) => { // Sort cards by sortCardsBy attribute
                    var diff = this.compareCardsByAttr(a, b, this.sortCardsBy, suitToStrength);
                    if(diff != 0)
                        return diff;

                    var secondarySortBy = this.sortCardsBy == 'suit' ? 'rank' : 'suit';
                    return this.compareCardsByAttr(a, b, secondarySortBy, suitToStrength);
                });

                cards.reverse(); //reverse because they will be appended to first location
                cards.forEach(card => { dojo.place(card, this.cardsContainer, 'first'); }); // Append cards in sorted order

                this.orderCardsButton.innerHTML = this.sortCardsBy == 'suit' ? _('sort by rank') : _('sort by suit');

                if(!doAnimate)
                    return;

                var animations = [];
                dojo.query('.a-card-clone', this.cardsContainer).forEach((cardClone, index) => {
                    var goTo = dojo.query('.a-card:not(.a-card-clone)[card-id=' + dojo.attr(cardClone, 'card-id') + ']', this.cardsContainer)[0];
                    var goToLeft = goTo.offsetLeft;

                    animations.push(this.gameui.animationHandler.animateProperty({
                        node: cardClone, 
                        easing: 'sineInOut',
                        properties: {left: goToLeft}, 
                        duration: 300
                    }));
                });
                animations = dojo.fx.combine(animations);
                animations.onEnd = () => {
                    dojo.query('.a-card-clone', this.cardsContainer).forEach(dojo.destroy);
                    dojo.query('.a-card', this.cardsContainer).forEach((card) => { card.style.opacity = null; });
                };
                animations.play();
            },

            getSuitToStrength(){
                var suitToStrength = {};
                for(card of this.handData){
                    if(!suitToStrength.hasOwnProperty(card.suit))
                        suitToStrength[card.suit] = [];
                    suitToStrength[card.suit].push(card);
                }

                for(suit in suitToStrength)
                    suitToStrength[suit] = this.gameui.getCardsStrength(suitToStrength[suit]);

                return suitToStrength;
            },

            compareCardsByAttr(cardA, cardB, attribute, suitToStrength = false){
                if(!suitToStrength)
                    suitToStrength = this.getSuitToStrength();

                function getCardSortValue(card){
                    if(attribute == 'suit'){
                        var suit = parseInt(dojo.attr(card, 'suit'));
                        return suitToStrength[suit];
                    }
                    return parseInt(dojo.attr(card, attribute));
                }

                var diff = getCardSortValue(cardB, attribute) - getCardSortValue(cardA, attribute);
                if(diff == 0 && attribute == 'suit')
                    return parseInt(dojo.attr(cardB, 'suit')) - parseInt(dojo.attr(cardA, 'suit'));
                return diff;
            },

            cardsContainerClicked(event){
                if(gameui.isInterfaceLocked() || !this.gameui.isCurrentPlayerActive() || this.gameui.gamedatas.gamestate.name != 'playCard')
                    return;

                if(!dojo.hasClass(event.target, 'a-card'))
                    return;

                this.cardClicked(event.target);  
            },

            setPlayableCardCounts(tableCardsCountIn, maxPlayableCardCountIn){
                this.tableCardsCount = tableCardsCountIn;
                this.maxPlayableCardCount = maxPlayableCardCountIn;
            },
            
            cardClicked(card){
                var cardData = {card_id: dojo.attr(card, 'card-id'), suit: dojo.attr(card, 'suit'), rank: dojo.attr(card, 'rank')};
                var newSet = { ...this.selectedCards };

                if(newSet.hasOwnProperty(cardData.card_id))
                    delete newSet[cardData.card_id];
                else newSet[cardData.card_id] = cardData;

                var resetSet = false;

                if(Object.keys(newSet).length > this.gameui.tableHandler.tableCards.length + 1 && !(this.gameui.tableHandler.tableCards.length == 0 && this.calcAllInOneSet()))
                    resetSet = true;

                if(!resetSet){
                    var setType = this.getSelectedCardsSetType(newSet);

                    if(Object.keys(setType).length == 0)
                        resetSet = true;
                    else this.selectedCards = newSet;
                }

                if(resetSet){
                   this.selectedCards = {};
                   this.selectedCards[cardData.card_id] = cardData; 
                }

                dojo.query('.a-card', this.cardsContainer).forEach((aCard) => { dojo.attr(aCard, 'selected', 'false'); });

                for(var card_id in this.selectedCards)
                    dojo.attr(dojo.query('.a-card[card-id="' + card_id + '"]', this.cardsContainer)[0], 'selected', 'true');

                this.updateStatusTextUponCardSelection();
            },

            getSelectedCardsSetType(cardsDict){
                var cardsSet = Object.values(cardsDict);
                if(cardsSet.length <= 0)
                    return {empty_set: 1};

                cardsSet = this.gameui.tableHandler.sortArrayOfCards(cardsSet);

                var isSameRank = true;
                var isSameSuit = true;

                for (var i = 0; i < cardsSet.length; i++) {
                    if(i == 0)
                        continue;

                    if(cardsSet[i].rank != cardsSet[i - 1].rank)
                        isSameRank = false;

                    if(cardsSet[i].suit != cardsSet[i - 1].suit)
                        isSameSuit = false;
                }

                var result = {};

                if(isSameRank)
                    result['sameRank'] = cardsSet[0].rank;
                if(isSameSuit)
                    result['sameSuit'] = cardsSet[0].suit;

                return result;
            },

            updateStatusTextUponCardSelection(){
                var playCardMenu = dojo.query('#pagemaintitletext .play-card-menu')[0];
                var statusText = dojo.query('.status-text', playCardMenu)[0];
                var selectedCardsContainer = dojo.query('.selected-cards-container', playCardMenu)[0];

                if(Object.keys(this.selectedCards).length <= 0){
                    statusText.style.display = null;
                    selectedCardsContainer.style.display = 'none';
                    dojo.attr(playCardMenu, 'has-selected-cards', 'false');
                    return;
                }

                var cardsArr = [];
                for(var key in this.selectedCards)
                    cardsArr.push(this.selectedCards[key]);

                cardsArr.sort((a, b) => { return parseInt(b.rank) - parseInt(a.rank); });

                var confirmButtonVisible = (cardsArr.length >= this.tableCardsCount && cardsArr.length <= this.maxPlayableCardCount) || (this.gameui.tableHandler.tableCards.length == 0 && cardsArr.length == this.handData.length && this.calcAllInOneSet());

                var cardIconsHTML = this.gameui.createCardIcons(cardsArr);

                var statusBarHTML = dojo.string.substitute(confirmButtonVisible ? _('Play ${cardIcons}') : _('Selected ${cardIcons}'), {cardIcons: cardIconsHTML});

                if(confirmButtonVisible)
                    statusBarHTML += '<a class="confirm-play-button bgabutton bgabutton_blue">' + _('Confirm') + '</a>';

                statusBarHTML += '<a class="cancel-play-button bgabutton bgabutton_gray">' + _('Cancel') + '</a>';

                selectedCardsContainer.innerHTML = statusBarHTML;
                dojo.attr(playCardMenu, 'has-selected-cards', 'true');

                dojo.query('.play-card-menu .confirm-play-button').connect('onclick', this, () => { this.confirmPlayButtonClicked(); });  
                dojo.query('.play-card-menu .cancel-play-button').connect('onclick', this, () => { this.cancelPlayButtonClicked(); });  

                selectedCardsContainer.style.display = null;
                statusText.style.display = 'none';
            },

            confirmPlayButtonClicked(){
                var buttonEvent = () => { 
                    var cardIDs = JSON.stringify(Object.keys(this.selectedCards));
                    this.gameui.ajaxcallwrapper('playCards', {cardIDs: cardIDs});
                };
                if(this.canFinishHand() && dojo.query('.a-card[selected=false]', this.cardsContainer).length > 0){
                    this.showConfirmationDialogWhenCanFinishHand(buttonEvent);
                    var confirmButton = dojo.query('.standard_popin .bgabutton_blue')[0];
                    dojo.addClass(confirmButton, 'bgabutton_red');
                    dojo.removeClass(confirmButton, 'bgabutton_blue');
                    confirmButton.innerHTML = '<span>' + _('Play my selection') + '</span>';
                } else buttonEvent();
            },

            cancelPlayButtonClicked(){
                this.unselectAllCards();
                this.updateStatusTextUponCardSelection();
            },

            unselectAllCards(){
                this.selectedCards = {};
                dojo.query('.a-card', this.cardsContainer).forEach((aCard) => { dojo.attr(aCard, 'selected', 'false'); });
            },

            removeCardsFromHandData(removedCardsData){
                if (!Array.isArray(removedCardsData))
                    removedCardsData = [{card_id: removedCardsData}];

                var handDataObj = {};
                var removedCardsObj = {};
                for(var nextCardData of this.handData)
                    handDataObj[nextCardData.card_id] = nextCardData;
                for(var nextCardData of removedCardsData)
                    removedCardsObj[nextCardData.card_id] = 1;

                this.handData = [];
                for(var key in handDataObj){
                    if(removedCardsObj.hasOwnProperty(key))
                        continue;
                    this.handData.push(handDataObj[key]);
                }
            },

            takeCardToHand(cardData, cardClone, cardDivToKill){
                var handDataObj = {};
                for(var nextCardData of this.handData)
                    handDataObj[nextCardData.card_id] = nextCardData;
                handDataObj[cardData.card_id] = cardData;

                this.handData = [];
                for(var key in handDataObj)
                    this.handData.push(handDataObj[key]);

                this.insertCardToHand(cardData);

                var goTo = dojo.query('.a-card[card-id=' + cardData.card_id + ']')[0];
                dojo.style(goTo, 'opacity', 0);
         
                dojo.place(cardClone, this.cardsContainer);
                dojo.style(cardClone, 'z-index', 1);
                this.gameui.placeOnObject(cardClone, cardDivToKill);

                var cardsToRight = [];
                this.gameui.animationHandler.animateOnObject({
                    node: cardClone,
                    goTo: goTo,
                    duration: 600,
                    easing: 'sineInOut',
                    onEnd: () => {
                        this.gameui.tableHandler.moveCardsOffTable(false);
                        dojo.destroy(cardDivToKill);
                        dojo.destroy(cardClone);
                        cardsToRight.forEach(dojo.destroy);
                        goTo.style.width = null;
                        goTo.style.marginLeft = null;
                        goTo.style.opacity = null;

                        this.gameui.releaseNotification();
                    }
                }).play();

                var goToMarginLeft = dojo.style(goTo, 'marginLeft');
                var cardWidth = dojo.style(goTo, 'width');

                dojo.style(goTo, 'width', 0);
                dojo.style(goTo, 'marginLeft', 0);

                this.gameui.animationHandler.animateProperty({
                    node: goTo, 
                    easing: 'quadOut',
                    properties: {width: cardWidth, marginLeft: goToMarginLeft}, 
                    duration: 200,
                    onEnd: () => {
                        if(!this.gameui.isMobile())
                            return;

                        var cardToRight = goTo.nextElementSibling;
                        while(cardToRight){
                            if(!dojo.hasClass(cardToRight, 'a-card') || dojo.hasClass(cardToRight, 'a-card-clone'))
                                break;

                            var cardToRightClone = this.gameui.cloneCard(cardToRight);
                            dojo.place(cardToRightClone, this.cardsContainer);
                            dojo.style(cardToRightClone, 'z-index', 2);
                            this.gameui.placeOnObject(cardToRightClone, cardToRight);

                            cardsToRight.push(cardToRightClone);
                            cardToRight = cardToRight.nextElementSibling;
                        }
                    }
                }).play();
            },

            setHandCountAttrForMobileResizing(doAnimate = true){
                if(doAnimate){
                    var cards = dojo.query('.a-card', this.cardsContainer);
                    cards.forEach((card) => { card.style.transition = 'margin 0.2s ease-in'; });
                    setTimeout(() => { cards.forEach((card) => { card.style.transition = null; }); }, 200);
                }
                
                dojo.attr(this.cardsContainer, 'hand-card-count-for-mobile-resizing', this.handData.length);                
            },

            insertCardToHand(cardData, insertToEnd){ 
                var aCard = dojo.create('div', {class: 'a-card game-area-card', suit: cardData.suit, rank: cardData.rank});
                dojo.attr(aCard, 'card-id', cardData.card_id);

                var cardDivs = false;

                if(!insertToEnd){
                    var cardDivs = dojo.query('.a-card', this.cardsContainer);
                    insertToEnd = cardDivs.length <= 0; 
                }

                if(insertToEnd){
                    dojo.place(aCard, this.cardsContainer);
                    return; 
                }

                var lastCardDiv = false;
                var insertAfterDiv = false;

                if(this.sortCardsBy == 'suit'){
                    cardDivs.forEach((node, index) => {
                        var nextSuit = parseInt(dojo.attr(node, 'suit'));
                        var nextRank = parseInt(dojo.attr(node, 'rank'));

                        if(nextSuit == parseInt(cardData.suit)){
                            if(!insertAfterDiv){
                                if(node.previousElementSibling)
                                    insertAfterDiv = node.previousElementSibling;
                                else insertAfterDiv = 'to_start';
                            }
                            if(nextRank > parseInt(cardData.rank))
                                insertAfterDiv = node;
                        }

                        lastCardDiv = node;
                    });
                } else { //sorted by rank
                    var matchingCards = [];

                    cardDivs.forEach((node, index) => {
                        var nextSuit = parseInt(dojo.attr(node, 'suit'));
                        var nextRank = parseInt(dojo.attr(node, 'rank'));

                        if(nextRank < parseInt(cardData.rank)){
                            if(!node.previousElementSibling)
                                insertAfterDiv = 'to_start';
                            return;
                        } else if(nextRank == parseInt(cardData.rank)){
                            matchingCards.push(node);
                        } else insertAfterDiv = node;

                        lastCardDiv = node;
                    });

                    if(matchingCards.length > 0){
                        insertAfterDiv = 'to_set_start';
                        var suitToStrength = this.getSuitToStrength();

                        for(nextCard of matchingCards){
                            if(this.compareCardsByAttr(aCard, nextCard, 'suit', suitToStrength) > 0)
                                insertAfterDiv = nextCard;
                            else break;
                        }

                        if(insertAfterDiv == 'to_set_start'){
                            if(matchingCards[0].previousElementSibling)
                                insertAfterDiv = matchingCards[0].previousElementSibling;
                            else insertAfterDiv = 'to_start';
                        }
                    }
                }

                if(!insertAfterDiv)
                    insertAfterDiv = lastCardDiv;

                if(insertAfterDiv == 'to_start')
                    dojo.place(aCard, this.cardsContainer, 'first');
                else dojo.place(aCard, insertAfterDiv, 'after');
            },

            cardSelectedToKeep(cardID){ this.gameui.ajaxcallwrapper('takeCardFromTableToHand', {cardID: cardID}); },

            passTurn(){
                if(this.gameui.gamedatas.gamestate.name != 'playCard' || !this.gameui.isCurrentPlayerActive())
                    return;

                var buttonEvent = () => { 
                    this.unselectAllCards();
                    this.gameui.ajaxcallwrapper('passTurn');
                };

                if(this.canFinishHand()){
                    this.showConfirmationDialogWhenCanFinishHand(buttonEvent);
                    var confirmButton = dojo.query('.standard_popin .bgabutton_blue')[0];
                    dojo.addClass(confirmButton, 'odn-yellow-button');
                    dojo.removeClass(confirmButton, 'bgabutton_blue');
                    confirmButton.innerHTML = '<span>' + _('Pass') + '</span>';
                } else buttonEvent();
            },

            canFinishHand(){
                if(!this.calcAllInOneSet())
                    return false;

                var tableLength = this.gameui.tableHandler.tableCards.length;
                if(tableLength != 0 && ![0, 1].includes(this.handData.length - tableLength))
                    return false;

                var tableCardsValue = this.gameui.getCardsStrength(this.gameui.tableHandler.tableCards);
                var handCardsValue = this.gameui.getCardsStrength(this.handData);

                return handCardsValue > tableCardsValue;
            },

            canPlayHigher(){
                var suitAndRankDicts = this.getSuitAndRankDicts();

                var tableValue = this.gameui.getCardsStrength(this.gameui.tableHandler.tableCards);
                var canPlayHigher = false;

                var possibleSets = [];
                for(var key in suitAndRankDicts.suitDict)
                    possibleSets.push(suitAndRankDicts.suitDict[key]);
                for(var key in suitAndRankDicts.rankDict)
                    possibleSets.push(suitAndRankDicts.rankDict[key]);

                while(possibleSets.length > 0){
                    var nextSet = possibleSets.pop();
                    nextSet.sort((a, b) => { return parseInt(b) - parseInt(a); });
                    var nextSetValue = parseInt(nextSet.join(''));

                    if(nextSetValue > tableValue)
                        return true;
                }

                return false;
            },

            showConfirmationDialogWhenCanFinishHand(buttonEvent){
                var dialogHTML = '<hr style="margin-bottom: 18px;">' + bga_format(_('You can play all your cards and clear your hand! *Turn on Auto-play for Finishing Hands*'), {'*': (t) => '<div class="confirmation-autoplay-link">' + t + '</div><hr>'});
                this.gameui.confirmationDialog(dialogHTML, () => { buttonEvent(); });
                dojo.query('.standard_popin br').forEach(dojo.destroy);
                dojo.connect(dojo.query('.standard_popin .confirmation-autoplay-link')[0], 'onclick', () => { //turn on auto-play finishing hands
                    this.gameui.closeConfirmationDialog();
                    this.gameui.prefHandler.setPref('auto_finish_hand', 1);
                    this.gameui.showTopBarTooltip(_('You can turn off this preference from the menu'), 'menu-wheel-tooltip', 3500);
                    
                    this.gameui.lockInterface();
                    setTimeout(() => { 
                        var cardIDs = JSON.stringify(this.handData.map(card => parseInt(card['card_id'])));
                        
                        this.gameui.unlockInterface();;
                        this.gameui.ajaxcallwrapper('playCards', {cardIDs: cardIDs}); 
                    }, 1000);
                });
            },

            timeBombPassButtonIfNeeded(){                
                var passButton = dojo.query('#page-title .pass-play-button')[0];

                if(!this.canPlayHigher())
                    this.gameui.timeBombButton(dojo.query('#page-title .pass-play-button')[0], 6000, {wiggleRoom: 2000, globalTimerName: 'passBomb'});
            },

            moveCardsOffHand(onAnimationEnd){
                this.selectedCards = {};

                var cardsToKill = [];
                var animations = [];

                dojo.query('.a-card', this.cardsContainer).forEach((cardDivToKill) => {
                    var cardClone = this.gameui.cloneCard(cardDivToKill);
                    dojo.place(cardClone, 'page-content');
                    this.gameui.placeOnObject(cardClone, cardDivToKill);

                    cardsToKill.push(cardDivToKill);

                    var left = dojo.style(cardClone, 'left');

                    animations.push(this.gameui.animationHandler.animateProperty({
                        node: cardClone, 
                        easing: 'quadOut', 
                        duration: 600, 
                        delay: 300,
                        properties: {left: -2 * this.gameui.getPos(cardClone).w},
                        onEnd: dojo.hitch(this, function(cardDivToKill){ dojo.destroy(cardClone); }, cardClone)
                    }));
                });

                animations = dojo.fx.combine(animations);
                animations.onEnd = onAnimationEnd;
                animations.play();

                cardsToKill.forEach(dojo.destroy);
            },

            dealMeCards(newHand){
                this.handData = newHand;
                
                this.displayHand();
                this.reorderCards(false);

                var animations = [];
                dojo.query('.a-card', this.cardsContainer).forEach((card, index) => {
                    var cardClone = this.gameui.cloneCard(card);
                    dojo.addClass(cardClone, 'dealing-cards-clone');
                    dojo.place(cardClone, 'page-content');
                    this.gameui.placeOnObject(cardClone, card);

                    var goToTop = dojo.style(cardClone, 'top');
                    var goToLeft = dojo.style(cardClone, 'left');
                    
                    dojo.style(cardClone, 'left', ((index - (newHand.length + 1)) * this.gameui.getPos(cardClone).w) + 'px');
                    dojo.style(cardClone, 'top', (dojo.style(cardClone, 'top') - 120) + 'px');

                    animations.push(this.gameui.animationHandler.animateProperty({
                        node: cardClone, 
                        easing: 'quadIn',
                        delay: 100 * (newHand.length - (index + 1)),
                        properties: {left: goToLeft, top: goToTop}, 
                        duration: 400
                    }));

                    card.style.opacity = 0;
                });

                animations = dojo.fx.combine(animations);
                animations.onEnd = () => {
                    dojo.query('.a-card-clone.dealing-cards-clone').forEach(dojo.destroy);
                    dojo.query('.a-card', this.cardsContainer).forEach((card) => { card.style.opacity = null; });
                };
                animations.play();

                this.gameui.releaseNotification();
            },

            calcAllInOneSet(){
                var suitAndRankDicts = this.getSuitAndRankDicts();

                this.allInOneSet = Object.keys(suitAndRankDicts.suitDict).length == 1 || Object.keys(suitAndRankDicts.rankDict).length == 1;
                return this.allInOneSet;
            },

            getSuitAndRankDicts(){
                var result = {'suitDict': {}, 'rankDict': {}};

                for(key in this.handData){
                    var cardData = this.handData[key];

                    if(!result.suitDict.hasOwnProperty(cardData.suit))
                        result.suitDict[cardData.suit] = [];
                    if(!result.rankDict.hasOwnProperty(cardData.rank))
                        result.rankDict[cardData.rank] = [];

                    result.suitDict[cardData.suit].push(cardData.rank);
                    result.rankDict[cardData.rank].push(cardData.rank);
                }

                return result;
            }
        });
    });
