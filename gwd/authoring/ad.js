var lastCouponUI = {}
var userHasPreviouslyExpandedUnit = false
var prefsURL = "prefs.json"
var prefs = {}
var apiTimer = 0;
var apiTimerValue = 0;
var that = this
var myCoupon = document.getElementById('my_coupon');
myCoupon.addEventListener('FETCH_DATA_COMPLETE', function(e) {
    signal.dispatch({
        type: "FETCH_DATA_COMPLETE"
    })
});
myCoupon.addEventListener('MESSAGE_RECEIVED', handleCellfireMessaging);

function handleCellfireMessaging(e) {
    //   // do you have an errorCode for me?
    //   if (e.statusCode == "") {
    //       return
    //   }
    //   // second, just determine if coupon was clipped
    //   if (e.statusCode == "0") {
    //       alert ("getting somewhere..")
    //       showSheet(e, prefs.formStrings.clipButtonSuccessText, true)
    //       return
    //   }


    switch (e.detail.action) {

        case "clipCoupon":
            showSheet(e.detail, prefs.formStrings.clipButtonSuccessText, true)
            signal.dispatch({
                type: 'CLIP_COUPON_COMPLETE'
            });


            break;

        case "addLoyaltyInfo":
        case "getActiveCoupons":
        case "getActiveCouponsByRetailer":
            showSheet(e.detail, prefs.formStrings.errorDismissButtonText, false)
            break

        default:
            //  showSheet(e.detail, false, false) // false is any failure message
            break
    }
    // switch ( e.statusCode )
    // {
    //     case "0":
    //         showSheet( detail, prefs.formStrings.clipButtonSuccessText, true )
    //         break
    //     default:
    //         showSheet( detail,  false , false ) // false is any failure message
    //         break
    // }
}

function showSheet(detail, buttonText, doCloseDialog) {
    var statusText = detail.headline + "<br><br>" + detail.description
    console.info('showSheet: '+statusText);

    $("#sheetText").html(statusText)

    if (buttonText) {
        $("#sheetDismissBTN").text(buttonText)
    }

    if (doCloseDialog) {
        $("#sheetDismissBTN").off("click")
        $("#sheetDismissBTN").on("click", function(e) {
            that.signal.dispatch({
                type: 'HIDE_CLIP_WINDOW',
                target: e.target
            })
        })
    } else {
        $("#sheetDismissBTN").off("click")
        $("#sheetDismissBTN").on("click", function(e) {
            that.signal.dispatch({
                type: 'DISMISS_SHEET'
            })
        })
    }
    $("#closeBTN").hide()
    $("#formContainer").addClass("blurred").addClass("dead")
    $("#sheet").show()
    TweenMax.from("#sheet", .4, {
        y: -$("#sheet").height(),
        ease: "Strong.easeOut"
    })
}

function hideSheet() {
  console.info('hideSheet()');
    // reset everything back to basics
    $("#sheetText").html("")
    $("#formContainer").removeClass("blurred").removeClass("dead")
    $("#sheet").hide()
    $("#masterSubmit").removeClass("dimmed").removeClass("dead")
    $("#masterSubmit").text(prefs.formStrings.clipButtonText)
    $("#sheetDismissBTN").text(prefs.formStrings.errorDismissButtonText)
    $("#closeBTN").show()
}

function installWindowResizeListener() {
    $(window).resize(function(evt) {
        textFit($(".couponDescription p"), {
            maxFontSize: 22,
            alignVert: true
        });
        textFit($(".couponSavings p"), {
            maxFontSize: 18,
            alignVert: true
        });
    });
}
//function drawFormAlert( detail ) {
//    $( "#closeBTN" ).hide( )
//    var statusText = detail.headline + "<br><br>" + detail.description
//        //   $( "#errorText" ).html( statusText + " (Error " + detail.statusCode + ")" )
//        //   $( "#formContainer" ).addClass( "blurred" ).addClass( "dead" )
//        //   $( "#sheet" ).show( )
//    TweenMax.from( "#sheet", .4, {
//        y: -$( "#sheet" ).height( ),
//        ease: "Strong.easeOut"
//    } )
//}
function removeFormAlert() {
    // this button could do one of two things: close the immediate alert sheet, 
    // or close both the sheet and coupon dialog together.
    // one place to switch on that decision: what is the current label of the button?
    //  
    //  var buttonLabel = ""
    //  
    //  try {
    //      buttonLabel = $( inButtonContext.target ).text( )
    //  } catch ( e ) {}
    //  
    //  // do something with knowledge gleaned from button label
    //  
    //  switch ( buttonLabel )
    //  {
    //      case api.prefs.clipButtonSuccessText:
    //          signal.dispatch( {
    //              type: 'CLIP_COUPON_COMPLETE'
    //          } )
    //          break
    //  }
    // reset everything back to basics
    // $( "#errorText" ).html( "" )
    // $( "#formContainer" ).removeClass( "blurred" ).removeClass( "dead" )
    // $( "#sheet" ).hide( )
    // $( "#masterSubmit" ).removeClass( "dimmed" )
    // $( "#masterSubmit" ).text( prefs.formStrings.clipButtonText )
    // $( "#sheetDismissBTN" ).text( prefs.formStrings.errorDismissButtonText )
    // $( "#closeBTN" ).show( )
}

function handleCustomSignal(s) {
    try {
        switch (s.type) {
            case "AD_INITIALIZED":
                console.log("#0F0|AD_INITIALIZED, loading prefs")
                loadPrefs();
                
                break;
            case "RUN":
                if (s.target == "expanded-page") {
                    if (!userHasPreviouslyExpandedUnit) {
                        startLoader()
                        myCoupon.fetchData();
                    }
                }
                break
            case "API_TIMED_OUT":
                break
            case "FETCH_DATA_COMPLETE":
                console.log("#FF1A27|cellfire : FETCH_DATA_COMPLETE")
                userHasPreviouslyExpandedUnit = true
                stopAPITimer()
                establishStrings()
                addCoupons()
                animateIn()
                installWindowResizeListener()
                break;
            case "MESSAGE_RECEIVED":
                handleCellfireMessaging(s.target)
                break;
            case "SHOW_CLIP_WINDOW":
                console.log("#3CF|SHOW_CLIP_WINDOW");
                animateInForm();

                //oc: track all offer expansions ()
                Enabler.counter('View_Offer_Ctr', true);

                //oc: viewOffer + offerId
                Enabler.reportCustomVariableCount1("View_Offer_"+ myCoupon.currentOfferId);
                
                break;
            case "HIDE_CLIP_WINDOW":
                console.log("#3CF|HIDE_CLIP_WINDOW")
                TweenMax.to("#clipWindowView", .2, {
                    opacity: 0,
                    scale: 0,
                    autoAlpha: 0
                })
                $("#detailImage").attr("src", "")
                $("#merchantCardIcon").attr("src", "blank.gif")
                document.getElementById("couponContainer").classList.remove("blurred");
                hideSheet()
                break
            case "DISMISS_SHEET":
                hideSheet()
                break
            case "MERCHANT_CHANGED":
                console.log("#FF1A27|cellfire : MERCHANT_CHANGED")
                updateLoyaltyFields()
                populateSupportMessage()
                updateCardIcon()
                break;
            case "FIELD_CHANGED":
                handleFieldChanged(s)
                break;
            case "CLIP_COUPON":

                //oc: track all clip attempts
                Enabler.counter('Clip_Coupon_Attempt_Ctr');

                //oc: clipOffer + offerId
                Enabler.reportCustomVariableCount1("Clip_Offer_"+ myCoupon.currentOfferId);

                handleClipCoupon();
                
                //oc: removed to prevent immediate open/close
                //hideSheet();

                break;
            case "CLIP_COUPON_COMPLETE":
                console.log("#FF1A27|cellfire : CLIP_COUPON_COMPLETE");

                //oc: track all clip successes
                Enabler.counter('Clip_Coupon_Success_Ctr');

                userDidClipCoupon();
                break
            case "USER_COLLAPSED_AD":
                console.log("collapsed. bye.")
                stopAPITimer()
                break
            default:
                logSignal("#3CF|", s)
                break
        }
    } catch (e) {}
}

function loadPrefs() {
    $.getJSON(prefsURL + "?xyz=" + Math.random()).done(prefsDidLoad).fail(prefsDidFail);
}

function prefsDidLoad(e) {
    prefs = e
    console.log("#ecf|" + arguments.callee.name)
    console.log("#ecf|" + JSON.stringify(prefs))
}

function prefsDidFail(e) {
    console.log("#f09|uh oh .. prefs.json has a problem!")
    console.log("#f09|", e.responseText)
}

function startLoader() {
    console.log("#ecf|" + arguments.callee.name)
    startAPITimer()
    TweenMax.to('#loader', .3, {
        rotation: "360",
        ease: Linear.easeNone,
        repeat: -1
    }, {
        timeScale: 0
    });
}

function startAPITimer() {
    console.log("#ecf|" + arguments.callee.name)
    stopAPITimer()
    if (prefs.secondsToWaitForAPI) {
        apiTimer = setInterval(monitorAPITimer, 1000);
    }
}

function stopAPITimer() {
    clearInterval(apiTimer)
    apiTimerValue = 0
}

function monitorAPITimer(e) {
    if (apiTimerValue == prefs.secondsToWaitForAPI) {
        stopAPITimer()
        if (e) {
            signal.dispatch({
                type: "API_TIMED_OUT"
            })
        } else {
            requestTimerExtension()
        }
    }
    apiTimerValue++
    console.log("#3CF|API loading timer:", prefs.secondsToWaitForAPI - apiTimerValue)
}

function requestTimerExtension() {
    var r = confirm("This connection is slow. Try a little longer?");
    if (r) {
        startAPITimer()
    }
}

function populateDetailView(index) {
    console.log("#ecf|" + arguments.callee.name);
    
    var offer = myCoupon.offers[index]
    var imageURL = myCoupon.imgPrefix + "offer/" + offer.offerId + "_300.png";
    $("#detailName p").html(offer.name)
    $("#detailDesc p").html(offer.description)
    $("#detailLongDesc p").html(offer.longDescription)
    $("#detailImage").attr("src", imageURL)
    populateSupportMessage()
}

function updateCardIcon() {
    console.log("#ecf|" + arguments.callee.name)
    var merchantID = document.getElementById("merchantDropdown").value
    var merchantCardURL = myCoupon.imgPrefix + "loyalty/" + merchantID + "_60.png"
    loadCardImage(merchantCardURL)
}

function loadCardImage(src) {
    var image = new Image;
    image.onload = function() {
        if ('naturalHeight' in this) {
            if (this.naturalHeight + this.naturalWidth === 0) {
                this.onerror();
                return null
            }
        } else if (this.width + this.height == 0) {
            this.onerror();
            return null
        }
        document.getElementById("merchantCardIcon").src = src;

        //oc: show merchant image too.
        TweenMax.to($('#merchantDropdown'), .25, {
            'text-indent': 65, 'opacity':1, 'padding-left': 65
        })
    };
    //oc: hide merchant image too.
    image.onerror = function() {
        document.getElementById("merchantCardIcon").src = "blank.gif"
        TweenMax.to($('#merchantDropdown'), .25, {
            'text-indent': 5, 'opacity': 0
        })
    };
    image.src = src;
}

function populateSupportMessage() {
    console.log("#ecf|" + arguments.callee.name)
    var merchantMenu = document.getElementById("merchantDropdown")
    var merchant = merchantMenu.options[merchantMenu.selectedIndex].value;
    var theMessage = ""
    try {
        theMessage = myCoupon.retailers[merchant].loyaltySupportMessage
    } catch (e) {}
    $("#merchantInfoHelp").html(theMessage)
}

function userDidClipCoupon() {
    console.log("#ecf|" + arguments.callee.name)
      
    TweenMax.to(lastCouponUI, .4, {
        scale: 0,
         ease: "Back.easeOut",
        onComplete: function(e) {
             var couponInsideGrid =  $(lastCouponUI).attr("id")
            $("#" + couponInsideGrid).remove()
        }
    })

}

function addCoupons() {
    console.log("#ecf|" + arguments.callee.name, myCoupon.offers.length || "??", " coupons to create.")
    for (var i = 0; i < myCoupon.offers.length; i++) {
        var coupon = addCoupon(myCoupon.offers[i], i)


        var myMouseOver = function(e) {
            handleCouponOver($(e.currentTarget))
        }
        var myMouseOut = function(e) {
            handleCouponOut($(e.currentTarget))
        }
        if (!isMobile) coupon.hover(myMouseOver, myMouseOut)
        coupon.click(function(e) {
            // console.log( e )
            var index = e.target.id.split("_")[1]
            updateRetailersSelectBox(index)
            populateDetailView(index)
            lastCouponUI = e.target
            signal.dispatch({
                type: "SHOW_CLIP_WINDOW"
            })
        })
    }


    $("#couponContainer").attr('tabindex', -1)
    $("#couponContainer").focus()
    $("#couponViewTemplate").remove()
}

function handleCouponOver(coupon) {
    var vanish = [coupon.find(".couponSavings")]
    TweenMax.to(coupon.find(".scissors"), .15, {
        scale: 1.2,
        yoyo: true,
        repeat: 50//oc: bug fix
    });
    TweenMax.to(coupon.find(".couponImage"), .2, {
        scale: 1.15
    });
}

function handleCouponOut(coupon) {
    var appear = [coupon.find(".couponSavings")]
    TweenMax.to(coupon.find(".scissors"), .2, {
        scale: 1
    });
    TweenMax.to(coupon.find(".couponImage"), .2, {
        scale: 1
    });
}

function adjustHeights(elem) {
    var fontstep = 2;
    if ($(elem).height() > $(elem).parent().height() || $(elem).width() > $(elem).parent().width()) {
        $(elem).css('font-size', (($(elem).css('font-size').substr(0, 2) - fontstep)) + 'px').css('line-height', (($(elem).css('font-size').substr(0, 2))) + 'px');
        adjustHeights(elem);
    }
}

function addCoupon(offer, inID) {
    var myContainer = $("#couponContainer")
    var template = $("#couponViewTemplate")
    if (!prefs.ui.showCategoryHeaders) {
        template.find(".couponCategory").hide()
    }
    var newCoupon = template.clone();
    myContainer.append(newCoupon)
    var category = offer.categoryName || prefs.defaultCategoryName
    var descText = offer.description
    var color = getColorFromCategory(category)
    var textColor = prefs.defaultTextColor || color

    $(newCoupon).attr("id", "ID_" + inID)
    var desc = $(newCoupon).find(".couponDescription p").html(descText)
    $(newCoupon).find(".couponTitle p").html(offer.brandName || "Click here!")



    $(newCoupon).find(".couponTitle p").css("color", textColor)
    $(newCoupon).find(".couponSavings p").html(formatMoney(Number(offer.faceValue)))
    var previewIMG = $(newCoupon).find(".couponImage")
    previewIMG.css('background-image', 'url(' + getImageURLFromOfferID(offer.offerId) + ')');
    $(newCoupon).find(".actionButton").css("background-color", textColor)


    var xyz = $(newCoupon).find(".couponDescription p")
    textFit(xyz, {
        maxFontSize: 22,
        alignVert: true
    });


    var abc = $(newCoupon).find(".couponSavings p")
    textFit(abc, {
        maxFontSize: 18,
        alignVert: true
    });


    return newCoupon
}

function getImageURLFromOfferID(id) {
  //  var imageSourceOverride = prefs.remoteImageSource || null
    var imageSourceFromFeed = myCoupon.imgPrefix + "offer/" + id + "_300.png"
  //  if (imageSourceOverride) imageSourceOverride = imageSourceOverride.replace("<id>", id)
    return  imageSourceFromFeed
}

function getColorFromCategory(inCategory) {
    return prefs.colorMap[inCategory] || prefs.colorMap[prefs.defaultCategoryName]
}

function formatMoney(n) {
    return "Save $" + n.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,");
}

function animateIn() {
    console.log("#ecf|" + arguments.callee.name)
    document.getElementById("couponContainer").classList.add("noFlow");
    TweenMax.to("#loader", .2, {
        opacity: 0,
        autoAlpha: 0,
        onComplete: function(e) {
            TweenMax.killTweensOf("#loader");
            $("#loader").remove();
        }
    })
    TweenMax.to("#couponContainer", 0, {
        opacity: 1,
    })

    var coupons = $(".couponView")
    var couponsInVisibleRange = $.grep(coupons, function(elem, index) {
        return ($(elem)[0].offsetTop <= $(window).height())
    })
    console.log("#FF0|animating in ", couponsInVisibleRange.length)
    TweenMax.allFrom(couponsInVisibleRange, .4, {
        alpha: 0,
        y: 100,
        delay: .3,
        ease: "Back.easeOut",
    }, .1, function(e) {
        document.getElementById("couponContainer").classList.remove("noFlow")
        document.getElementById("couponContainer").classList.remove("dead")
    })
}
// test
// offer: el paso
// merchant: safeway, giant eagle, meijer
function updateRetailersSelectBox(index) {
    console.log("#ecf|" + arguments.callee.name);
    //oc: grab merchantDropdown from DOM
    var merchantDropdown = document.getElementById("merchantDropdown");
    //oc: clear options
    merchantDropdown.options.length = 0;
    //oc: save offer Id on coupon component for later usage.
    myCoupon.currentOfferId = myCoupon.offers[index]['offerId'];
    //oc: populate select box with current offer's retailers
    var merchantIds = myCoupon.offers[index]['merchantIds']['int'];
    for (var i = 0; i < merchantIds.length; i++) {
        var opt = document.createElement('option'); // create new option element
        var theHTML = prefs.errors.feedIncomplete
        try {
            theHTML = myCoupon.retailers[merchantIds[i]]['name'];
        } catch (e) {
            console.log(e)
        }
        opt.innerHTML = theHTML
        opt.value = merchantIds[i];
        merchantDropdown.appendChild(opt);
    }
    //oc: sort the merchants
    $("#merchantDropdown").html($("#merchantDropdown option").sort(function(a, b) {
        return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
    }))
    merchantDropdown.selectedIndex = 0
    signal.dispatch({
        type: "MERCHANT_CHANGED"
    })
}

function animateInForm() {
    console.log("#ecf|" + arguments.callee.name)
    TweenMax.killAll()
    TweenMax.to("#clipWindowView", 0, {
        opacity: 1,
        autoAlpha: 1,
        scale: 1
    })
    TweenMax.from("#clipWindowView", .4, {
        opacity: 0,
        scale: 0,
        ease: "Back.easeOut"
    })
    document.getElementById("couponContainer").classList.add("blurred");
}

function displayMerchantMessaging() {
    console.log("#ecf|" + arguments.callee.name)
    var merchantMenu = document.getElementById("merchantDropdown")
    var merchant = merchantMenu.options[merchantMenu.selectedIndex].text;
    console.log("merchant selected: ", merchant, "(id ", merchantMenu.value + ")")
}

function setLastOfferSelected() {}

function getLastSelectedOfferID() {
    var id = $(lastCouponUI).attr("id")
    return id.split("_")[1]
}

function updateLoyaltyFields() {
    var retailerSelectBoxElement = document.getElementById("merchantDropdown");
    var validationFieldsElement = document.getElementById('validation_fields');
    console.log('updateLoyaltyFields()');
    console.log('which merchant: ' + retailerSelectBoxElement.value);
    console.log(myCoupon.retailers[retailerSelectBoxElement.value]['QAuthenticationModels']['QLoyaltyAuthenticationModel']);
    //oc: clear out inputs
    validationFieldsElement.innerHTML = '';
    //oc: determine if there are multiple accepted auth methods 
    if (myCoupon.retailers[retailerSelectBoxElement.value]['QAuthenticationModels']['QLoyaltyAuthenticationModel']['0']) {
        console.log('We have array of authModels');
        //oc: create inputs
        var authenticationModelsArr = myCoupon.retailers[retailerSelectBoxElement.value]['QAuthenticationModels']['QLoyaltyAuthenticationModel'];
        for (var i = 0; i < authenticationModelsArr.length; i++) {
            //oc: check if we need to add OR
            if (i > 0) {
                console.log('this is not our first authModel, lets put tell user they can use the previous OR this one.');
                var orElement = document.createElement("div")
                validationFieldsElement.appendChild(orElement);
                $(orElement).addClass("orClass")
                $(orElement).html("or")
            } //end if
            //oc: determine if there are multiple validation fields
            parseValidationFields(authenticationModelsArr[i]['QLoyaltyValidationFields'])
        } //end for
    } else {
        console.log('there is one auth method')
        parseValidationFields(myCoupon.retailers[retailerSelectBoxElement.value]['QAuthenticationModels']['QLoyaltyAuthenticationModel']['QLoyaltyValidationFields']);
    } //end else
}; //end function updateLoyalty fields
function xxxparseValidationFields(validationFields) {
    var validationFieldsElement = document.getElementById('validation_fields');
    console.info('parseValidationFields()');
    console.log(validationFields);
    if (validationFields['QLoyaltyValidationField']['0']) {
        console.log('we have multiple fields in this model');
        for (var i = 0; i < validationFields['QLoyaltyValidationField'].length; i++) {
            validationFieldsElement.appendChild(createValidationField(validationFields['QLoyaltyValidationField'][i]));
        }
    } else {
        console.log('we have only 1 field: ' + validationFields['QLoyaltyValidationField']['name']);
        validationFieldsElement.appendChild(createValidationField(validationFields['QLoyaltyValidationField']));
    } //end else
} //end function
/*
 * This function creates a validation field
 * validationID is used to identify the type of the field. 
 * validationID can have the following values:
 *  •   1 (Loyalty Card)
 *  •   2 (Phone Number)
 *  •   3 (PIN)
 *  •   4 (Shopper ID)
 *  •   5 (Email ID)
 *  •   6 (Username)
 *  •   7 (Password)
 *
 */
function createValidationField(field) {
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter ' + field['name'];
    input.dataset.validationId = field['validationID']; //oc: https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Using_data_attributes
    var id;
    var niceLabel;
    switch (field['validationID']) {
        case '1':
            id = 'loyalty';
            niceLabel = "Loyalty";
            break;
        case '2':
            id = 'phone';
            niceLabel = "Phone";
            break;
        case '3':
            id = 'pin';
            niceLabel = "PIN";
            break;
        case '4':
            id = 'shopper_id';
            niceLabel = "Shopper ID";
            break;
        case '5':
            id = 'email';
            niceLabel = "Email";
            break;
        case '6':
            id = 'username';
            niceLabel = "Username";
            break;
        case '7':
            id = 'password';
            niceLabel = "Password";
            break;
        default:
            console.log('Unknown validationID');
            id = 'validationId' + field['validationID'];
    } //end switch
    input.id = id;
    input.className = 'auth';
    input.setAttribute("nice-label", niceLabel)
    return input;
} //end function
function prepareLoyaltyData() {
    console.log('prepareLoyaltyData()');
    var loyaltyData = [];
    $('#validation_fields input').each(function(index) {
        console.log('value: ' + this.value);
        if (this.value != '') {
            var loyaltyDataObj = {
                'mod:id': this.dataset.validationId,
                'mod:value': this.value
            };
            loyaltyData.push(loyaltyDataObj);
        } //end if
    });
    return loyaltyData;
}

function handleClipCoupon() {

    //oc: check if all are blank:
    var isBlank = true;
    $('#validation_fields input').each(function(index) { 
      var value = $.trim($(this).val());
      if(value != '') isBlank = false;
    });
    if (isBlank) {
      console.log('isBlank');
        showSheet(prefs.errors.emptyFormError);
        return;
    }  

    console.log('onAddLoyaltyClick() / handleClipCoupon() ');

    var merchantId = document.getElementById('merchantDropdown').value;
    //oc: prepare loyaltyData[]
    var loyaltyData = prepareLoyaltyData();
    console.log("#F90|", loyaltyData);
    $("#masterSubmit").addClass("dimmed")
    $("#masterSubmit").html(prefs.formStrings.isClippingText)
    myCoupon.addLoyaltyInfo(loyaltyData, merchantId);
}

function establishStrings() {
    $("#merchantPrompt").html(prefs.formStrings.merchantPrompt)
    $("#browseBTN").text(prefs.formStrings.cancelButtonText)
    $("#masterSubmit").text(prefs.formStrings.clipButtonText)
    $("#sheetDismissBTN").text(prefs.formStrings.errorDismissButtonText)
}
// don't throw this  away: it is the previous, long-winded parser which attempts an "AND" joiner .. might need it again.
function parseValidationFields(validationFields) {
    var validationFieldsElement = document.getElementById('validation_fields');
    console.log('parseValidationFields()');
    console.log(validationFields);
    if (validationFields['QLoyaltyValidationField']['0']) {
        console.log('we have multiple fields in this model');
        for (var i = 0; i < validationFields['QLoyaltyValidationField'].length; i++) {
            validationFieldsElement.appendChild(createValidationField(validationFields['QLoyaltyValidationField'][i]));
            if (i < validationFields['QLoyaltyValidationField'].length - 1) {
                var andElement = document.createElement("div")
                validationFieldsElement.appendChild(andElement);
                $(andElement).addClass("andClass")
                $(andElement).html("and")
            }
        }
    } else {
        console.log('we have only 1 field: ' + validationFields['QLoyaltyValidationField']['name']);
        var onlyOneField = createValidationField(validationFields['QLoyaltyValidationField'])
        validationFieldsElement.appendChild(onlyOneField);
    } //end else
} //end function
$(document).keyup(function(e) {
    if (e.keyCode === 27) signal.dispatch({
        type: "HIDE_CLIP_WINDOW"
    })
});


//  var $window = $(window);
//  var width = $window.width();
//  var height = $window.height();
//  var scale;
//  // early exit
////  if(width >= maxWidth && height >= maxHeight) {
////      $('#clipWindowView').css({'-webkit-transform': ''});
////      $('#expanded').css({ width: '', height: '' });
////      return;
////  }
//  scale = Math.min(width/myMaxWidth, height/myMaxHeight);
//  $('#clipWindowView').css({'-webkit-transform': 'scale(' + scale + ')'});
//  $('#expanded').css({ width: myMaxWidth * scale, height: myMaxHeight * scale });
