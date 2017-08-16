/* Options: maybe controlled through Admin at some point */
//
var useDatePicker = 0; // use date input calendar art?
//
var useGMapNorm = 0; // use google map normalizer?
//
var useIntTel = 0; // use InternationlTel flag art?
var telReady = 0;
//
var useTypeAhead = 1; // use Twitter TypeAhead?
/* */





$(document).ready(function() {

   $('[data-tooltip]').tooltip();

   $('.navbar .nav li a').click(function(){
	  if($(this).attr('target') == undefined){
		  window.location=($(this).attr('href'));
	  }
  });



});

// Disable Console.log for browsers that dont support it or if debugging
var debugging = true; // or true
if (typeof console == "undefined") var console = { log: function() {} };
else if (!debugging || typeof console.log == "undefined") console.log = function() {};


// Don't need document.ready since our script is getting loaded at the bottom of the page instead of in <head>

$(document).ready(function() {
	$('#productForm').submit(function() {
		sum = 0;
		$('#productForm input:text').each(function() {
			if (!isNaN($(this).val())) {
				sum += parseInt($(this).val());
			}
		});
		if (sum === 0) {
			alert('Need to enter a quantity!');
			return false;
		} else {
			return true;
		}
	});
});

// Parsley settings
$(document).ready(function () {
	var limit_feed = ["text", "tel", "email", "password", "url", "datetime", "time", "number"];

	$('form').each(function() {
		$(this).parsley({
			successClass: 'has-success',
			errorClass: 'has-error',
			errors: {
				classHandler: function(el) {
					return el.parent();
				},
				errorsWrapper: '',
				errorElem: ''
			},
			listeners: {
				onFieldError: function ( elem, constraints, ParsleyField ) {
					if (!elem.parents('.form-group').hasClass('has-feedback'))
						elem.parents('.form-group').addClass('has-feedback');

					if ($.inArray(elem[0].type, limit_feed) >= 0){
					  if (elem.parent().find(".fa"))
						  elem.parent().find(".fa").remove();
					  elem.after('<span class="fa fa-exclamation-triangle form-control-feedback"></span>');
					}

					elem.attr("data-original-title", elem[0].validationMessage);
					elem.tooltip("show");
				},
				onFieldSuccess: function ( elem, constraints, ParsleyField ) {					
					if (!elem.parents('.form-group').hasClass('has-feedback'))
						elem.parents('.form-group').addClass('has-feedback');
					if ($.inArray(elem[0].type, limit_feed) >= 0){
					  if (elem.parent().find(".fa"))
						  elem.parent().find(".fa").remove();
					  elem.after('<span class="fa fa-ok form-control-feedback"></span>');
					}

					elem.tooltip("destroy");
				}
			}
		});
	});
});


// Adjusts the quantity of the +/- fields
function adjustQuantity(qtyField, increment, postForm) {
	if (isNaN(qtyField.val())) {
		qtyField.val(0);
	}
	var limit = parseInt(qtyField.data('limit'));
	var previousValue = parseInt(qtyField.val());
	var id = qtyField.data('id');
	var model = qtyField.data('model');

	// Don't let quantity go below 0 if we're submitting to the server
	// After quickcart can fully access the API with customers authenticated through oauth we should be able to remove items dynamically under this condition
	if (typeof id !== 'undefined') {
		var compareValue = 1;
		if (qtyField.val() == 0 && !$("#wishlist").length && !$("#registry").length) { // Change 0 to 1, we shouldn't be submitting 0s to the server || Edit: Unless it's registry or wishlist
			qtyField.val(1);
			previousValue = 1;
		}
	} else {
		var compareValue = 0;
	}

	// Don't go below the compare value
	// edit: Unless you're on wishlist or registry
	if (!$("#wishlist").length && !$("#registry").length && previousValue <= compareValue && increment < 0) {
		return;
	}
	if(previousValue + increment <= 0 ){
		qtyField.val(0);
	} else {
		qtyField.val(previousValue += increment);
	}

	//Set qty to limit if entered value is above
	if(limit){
	  if(!isNaN(limit)){
		if(previousValue > limit){
		  qtyField.val(limit);
		}
	  }
	}

	// Because of our situation with OAuth, we need to use the form to update wishlist and registry items; however, we can use the api to update sessioncart items.
	if (typeof id !== 'undefined') { // We need to submit the updated quantity to the server
		var form = qtyField.parents('form');
		var formData = form.serialize(); // We must serialize our form data here because disabled fields are not submitted

		// Dim quantity field while we update
		qtyField.parents('.quantity').find('input,button').prop('disabled',true);

		if (typeof model === 'undefined') { // No model defined, so submit the entire form
			$.ajax({
				type: form.attr('method'),
				url: form.attr('action'),
				data: formData + '&action=update'
			}).always(function(e) {
				qtyField.parents('.quantity').find('input,button').prop('disabled',false);
			});
		} else {
			qtyField.parents('.item').find('.error').hide();
			// Model is defined, so use the API to submit a put request
			$.ajax({
				type: 'put',
				url: acendaBaseUrl + '/api/' + model + '/' + id,
				dataType: 'json',
				data: JSON.stringify({ quantity: qtyField.val() })
			}).always(function(e) {
				qtyField.parents('.quantity').find('input,button').prop('disabled',false);
			}).fail(function(e) {
				data = $.parseJSON(e.responseText);
				qtyField.val(previousValue -= increment);
				if (data.code === 400 && model === 'sessioncartitem') { // Bad request for the cart - not enough inventory
					qtyField.parents('.item').find('.error').html('Not enough inventory to add more items!');
				} else { // Probably a connection failure
					qtyField.parents('.item').find('.error').html('Unknown error: could not update quantity.');
				}
				qtyField.parents('.item').find('.error').show();
			}).done(function(e) {
				if (model === 'sessioncartitem') { // Check if we're at the cart, and if so, update the cart subtotal/individual item totals
					updateCartTotals(qtyField, id);
				}
			});
		}
	}
}

// Updates the subtotal and current item total.
function updateCartTotals(qtyField, cartItemId) {
	$.getJSON(acendaBaseUrl + '/api/sessioncart')
	.always(function(e) {
		$('#subtotal').css({'opacity':1});
	})
	.done(function(data) {
		// Different field name if it's a sale amount vs. regular
		if (qtyField.parents('.item').find('.sale').length) {
			var priceElement = qtyField.parents('.item').find('.sale .amount');
		} else {
			var priceElement = qtyField.parents('.item').find('.regular .amount');
		}

		var amount = priceElement.find('.dollars').html() + '.' + priceElement.find('.cents').html();
		amount = parseFloat(amount * data.result.items[cartItemId].quantity).toFixed(2);

		// Line item amount
		var item_amount = amount.split('.');
		// toLocaleString for the commas
		qtyField.parents('.item').find('.total .dollars').html(parseInt(item_amount[0]).toLocaleString());
		qtyField.parents('.item').find('.total .cents').html(item_amount[1]);

		// Subtotal
		var result = data.result.subtotal.split('.');
		// toLocaleString for the commas
		$('#subtotal .amount .dollars').html(parseInt(result[0]).toLocaleString());
		$('#subtotal .amount .cents').html(result[1]);
	});
}

$('div#wishlist .modal_list_quantity, div#registry .modal_list_quantity').on('hidden.bs.modal', function () {
	document.location.reload();
})

// +/- buttons on single page and collections
$('.btn-add').click(function(e) {
	e.preventDefault();
	adjustQuantity($(this).parent().parent().find('.quantity-selector'), 1);
});
$('.btn-remove').click(function(e) {
	e.preventDefault();
	adjustQuantity($(this).parent().parent().find('.quantity-selector'), -1);
});
// Hitting the enter key on the add quantity fields
$('.quantity-selector').change(function(e) {
	adjustQuantity($(this), 0); // Quantity was adjusted externally
});
$('.quantity-selector').keypress(function(e){
	// Run adjust quantity action when numbers are entered in field
	if (e.which == 13)
	{
		e.preventDefault();
		adjustQuantity($(this), 0); // Quantity was adjusted externally
	}
});



function IncludeJavaScript(jsFile, onLoadCallback) {
	var head = document.getElementsByTagName('head')[0] || document.documentElement;
	var s = document.createElement('script');
	s.type = 'text/javascript';
	s.async = true;
	s.src = jsFile;
	if (onLoadCallback) {
		s.onload = s.onreadystatechange = function() {
			if (!s.readyState || s.readyState == 'loaded' || s.readyState == 'complete') {
				s.onreadystatechange = null;
				onLoadCallback(s);
			}
		};
	}
	head.appendChild(s);
}


$(document).ready(function() {
	$.ajaxSetup ({
   	 // Disable caching of AJAX responses
	    cache: false
	});	
	$.get(acendaBaseUrl+'/account/toolbar', function(data) {
		$('.toolbarajax').html(data);
		//
		$('.flashajax').load(acendaBaseUrl+'/account/flashes');
		//
		$('.navajax').load(acendaBaseUrl+'/account/nav', function() {
			//alert( "Load was performed." );
			IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/yta-menu.js",function(){
			});
		});
		//
		$.getJSON(acendaBaseUrl + '/api/sessioncart', function(data) {
			$('li.cart a.tool-tab span.item-count').html(data.result.item_count);
		});
		//$('li.tool .my-account').load(acendaBaseUrl + '/account/toolbar');
		//
		IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/quickcart.js",function(){
		});
	});
	//
	$('head').append('<link rel="stylesheet" type="text/css" href="'+acendaBaseThemeUrl+'/assets/fonts/font-awesome-4.7.0/css/font-awecenda.min.css">');
	//
	IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/jquery.zoomify.js",function(){
		IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/jquery.zoomcenda.js",function(){
		});
	});
	//
	if ($('.star-rating-input').length) {
		IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/rating.js",function(){
		});
	}
	//
	IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/signup.js",function(){
	});
});

if (useDatePicker) {
	IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/bootstrap-datepicker.js",function(){
		$('head').append('<link rel="stylesheet" type="text/css" href="'+acendaBaseThemeUrl+'/assets/css/theme/datepicker.css">');
		$('input[datepicker=1]').datepicker({
			format: 'yyyy-mm-dd'
		});
	});
}
//
if (useGMapNorm) {
	IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/google_map_normalizer.js",function(){
	});
}
//
if (useIntTel) {
	function numbersonly(myfield, e, dec) {
		var key;
		var keychar;
		if (window.event)
			key = window.event.keyCode;
		else if (e)
			key = e.which;
		else return true;
			keychar = String.fromCharCode(key);
		// control keys
		if ((key==null) || (key==0) || (key==8) || (key==9) || (key==13) || (key==27) )
			return true;
		// numbers
		else if ((("0123456789").indexOf(keychar) > -1)) return true;
		// decimal point jump
		else if (dec && (keychar == ".")) {
			myfield.form.elements[dec].focus(); return false;
		}
		else
			return false;
	}

	IncludeJavaScript(acendaBaseThemeUrl+"/assets/intl-tel-input/build/js/intlTelInput.js",function(){
    	telReady = 1;
		$('head').append('<link rel="stylesheet" type="text/css" href="'+acendaBaseThemeUrl+'/assets/intl-tel-input/build/css/intlTelInput.css">');
		var input = $("#phone");
		input.intlTelInput({
			utilsScript: acendaBaseThemeUrl+"/assets/intl-tel-input/build/js/utils.js",
			nationalMode: true
		});
		input.on("keyup change", function() {
			$("#intlPhone").val(input.intlTelInput("getNumber"));
		});
	});
}
//


if (useTypeAhead) {
	IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/typeahead.js",function(){
		var searchCompleterCategory = new Bloodhound({
		datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		prefetch: {
		  url: acendaBaseUrl+'/api/category/tree',
		  ttl: 300000, //5 min cache
		  transform: function (response) {
			res = [];
			for(var k in response.result) {
				var v = k.replace('-',' ').replace('/',' > ').replace(/\w+/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
				res.push({'value':v, 'url':acendaBaseUrl+'/category/'+k});
			  }
			return res;
		  }
		}
		});

		var searchCompleterProduct = new Bloodhound({
		datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		remote: {
		  url: acendaBaseUrl+'/api/catalog/autocomplete?search=%QUERY',
		  wildcard: '%QUERY',
		  transform: function (response) {
			res = [];
			for (var i = 0, len = response.result.length; i < len; i++) {
			  res.push({'value':response.result[i]});
			}
			return res;
		  }
		}
		});
		//
		$('.search-autocomplete').typeahead(null,
			{
				name: 'search',
				display: 'value',
				source: searchCompleterCategory
			},
			{
				name: 'search',
				display: 'value',
				source: searchCompleterProduct
			}
		).on('typeahead:selected', function(event, selection) {
			if('url' in selection) {
				window.location=selection.url;
			}
		});
	});
}



var slickReady = 0;
var spslides = 5;
if ($('.vari-video').length) spslides = 4
function productSlick() {
	$('.slick-p-go').slick({
		dots: false,
		infinite: false,
		speed: 500,
		slidesToShow: spslides,
		slidesToScroll: spslides
	});
	$('.slick-p .virg').removeClass('virg');
	$('.slick-p-go').removeClass('slick-p-go');
    
}

if ($('.slick').length) {
	IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/slick-1.6.0/slick.min.js",function(){
		slickReady = 1;
		if ($('.slick-p.slick-p-go').length) {
			//console.log('pS call s')
			productSlick();
		}
	});
}

if ($('select.vopt').length) {
    IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/jquery.selectric.mod.js",function(){
		$('select.vopt').on('change', function() {
			//console.log($(this).val())
			$('select.vopt').selectric('refresh');
			var desVal = $(this).val();
			var desInd = 0;
			$(this).find('option').each(function() {
				if ($(this).attr('value') == desVal) {
					desInd = $(this).attr('data-index');
					return false;
				}
			});
			$(this).parents('.selector-details').find('.selectric-vopt li[data-index="'+desInd+'"]').click();
		});
		//
		$('select.vopt').selectric({
			
		});
		//console.log('Selectric applied')
	});
}








/* stores all */
/* store locator */
function ChangeUrl(title, url) {
	if (typeof (history.pushState) != "undefined") {
		console.log('can pushState')
		var obj = { Title: title, Url: url };
		history.pushState(obj, obj.Title, obj.Url);
	} else {
		console.log('can not pushState')
		//alert("Browser does not support HTML5.");
	}
}

function updateUrlParameter(param, value) {
	const regExp = new RegExp(param + "(.+?)(&|$)", "g");
	const newUrl = window.location.href.replace(regExp, param + "=" + value + "$2");
	window.history.pushState("", "", newUrl);
}

function getQueryParams(qs) {
	qs = qs.split("+").join(" ");
	var params = {},
		tokens,
		re = /[?&]?([^=]+)=([^&]*)/g;

	while (tokens = re.exec(qs)) {
		params[decodeURIComponent(tokens[1])]
			= decodeURIComponent(tokens[2]);
	}

	return params;
}

var desire = getQueryParams(document.location.search);

/* stores */
var mapReady = setInterval(function(){
	if (typeof jQuery != 'undefined' && ($('#map').length || $('#search-locs').length)) {
		IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/locations.js",function(){
			$('body').append('<script src="https://maps.googleapis.com/maps/api/js?key='+gMapApiKey+'&libraries=places&rankby=distance&callback=acendaMaps" async defer></script>');
			clearInterval(mapReady);
		});
	}
},1000);

// final
IncludeJavaScript(acendaBaseThemeUrl+"/assets/js/acended.js",function(){
});