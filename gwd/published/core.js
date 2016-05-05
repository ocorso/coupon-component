    var signal = new signals.Signal( )
    signal.add( handleSignal )
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test( navigator.userAgent )

    function handleSignal( inSignal ) {
        if ( !inSignal ) return
        switch ( inSignal.type ) {
            case "DOMContentLoaded":
                logSignal( "orange|GWD ", inSignal )
                if ( isMobile ) {
                    document.getElementById( "invitationImage" ).setAttribute( "source", "tapToExpand.jpg" )
                }
                break
            case "WebComponentsReady":
                logSignal( "orange|GWD ", inSignal )
                break
            case "adinitialized":
                logSignal( "orange|GWD ", inSignal )
                signal.dispatch( {
                    type: "AD_INITIALIZED"
                } )
                break
            case "pagepresenting":
                logSignal( "orange|GWD ", inSignal )
                run( inSignal )
                break
            case "fullscreenDimensions":
                logSignal( "lightgreen|ENABLER ", inSignal )
                break
            case "expandStart":
            case "fullscreenExpandStart":
                logSignal( "lightgreen|ENABLER ", inSignal )
                break
            case "expandFinish":
            case "fullscreenExpandFinish":
                logSignal( "lightgreen|ENABLER ", inSignal )
                break
            case "collapseStart":
            case "fullscreenCollapseStart":
                logSignal( "lightgreen|ENABLER ", inSignal )
                break
            case "collapseFinish":
            case "fullscreenCollapseFinish":
                logSignal( "lightgreen|ENABLER ", inSignal )
                signal.dispatch( {
                    type: "USER_COLLAPSED_AD"
                } )
                break
            default:
                handleCustomSignal( inSignal ) // found inside ad.js
                break
        }
    }

    function run( s ) {
        console.log( "#ecf|run()" )
        signal.dispatch( {
            type: "RUN",
            target: s.target.id
        } )
    }

    function logSignal( token, inSignal ) {
        var msg = inSignal.type + " "
        var iter = inSignal
        if ( "target" in inSignal ) {
            msg += " on " + inSignal.target
            if ( "id" in inSignal.target ) {
                msg += " #" + inSignal.target.id
            }
            if ( "name" in inSignal.target ) {
                msg += " \"" + inSignal.target.name + "\""
            }
        }
        var propList = ""
        Object.getOwnPropertyNames( iter ).forEach( function( val, idx, array ) {
            propList += ( val + ' = ' + iter[ val ] + "<br>" );
        } );
        if ( showConsole === true ) console.log( token || "white|", msg, propList )
        else console.info( inSignal )
    }

    function deregisterMyElements( ) {
        var a = document.querySelectorAll( "gwd-taparea[id^=node_]" )
        for ( var i = 0; i < a.length; i++ ) gwd.actions.events.removeHandler( a[ i ].id, 'action', gwd.handleSignal, false )
    }
    /////// drag and drop for console
    var selected = null,
        x_pos = 0,
        y_pos = 0,
        x_elem = 0,
        y_elem = 0;

    function _drag_init( elem ) {
        // Store the object of the element which needs to be moved
        selected = elem;
        x_elem = x_pos - selected.offsetLeft;
        y_elem = y_pos - selected.offsetTop;
    }

    function _move_elem( e ) {
        x_pos = document.all ? window.event.clientX : e.pageX;
        y_pos = document.all ? window.event.clientY : e.pageY;
        if ( selected !== null ) {
            selected.style.left = ( x_pos - x_elem ) + 'px';
            selected.style.top = ( y_pos - y_elem ) + 'px';
        }
    }

    function _destroy( ) {
        selected = null;
    }
    if ( showConsole )
    {
        document.getElementById( 'myConsole' ).onmousedown = function( ) {
            _drag_init( this );
            return false;
            document.onmousemove = _move_elem;
            document.onmouseup = _destroy;
        };
    }
