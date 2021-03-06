var cartIsReadyYet = 0;
var qcrecalc = 1;
var qcwearego = 0;
var pushdL = 0;

// boots v4
$('body').on('mouseenter focusin','.header .cart',function(){
    //console.log('e event only IN');
    if (qcwearego != 1) {
        if (!$('.dropdown-qc').hasClass('show')) {
            qcwearego = 1;
            $('#btn-qc').dropdown('toggle');
        }
    } else {
        //console.log('e event has already happened, no dupe');
    }
});

$('body').on('mouseleave focusout','.header .cart',function(){
    qcwearego = 0;
});

$('.dropdown-qc').on('show.bs.dropdown', function () {
    if (qcrecalc == 1) {
        //console.log('bs show, now try qc fetch');
        ajaxCart("{}", true);
    } else {
        if ($('.quickcart .item-count') > 0) {
            displayCart();
        }
    }
});


$('.dropdown-qc').on('hidden.bs.dropdown', function () {
    resetErrors();
});







$(function() {
    ajaxCart("{}", true);
});

var pData;
var vData = $('.product-details .active');

$(document).on('click','button[value=cart]', function(event) {
    $('.dropdown-qc').removeClass('qc-ready');
    qcrecalc = 1;
	pushdL = 1;
    event.preventDefault();
    if ($('#singleProduct').length) {
        pData = $('#product-intro');
        vData = $('.product-details .active');
    } else {
        pData = $(this).parents('.piece');
        vData = $(this).parents('.piece').find('.active');
    }
    var cartButton = event.currentTarget;
    var form = cartButton.parentElement;
    while(form.nodeName != 'FORM'){
        form = form.parentElement;
    }
    form = $(form);
    var sum = 0;
    form.find(".quantity-selector").each(function() {
        if (!isNaN($(this).val())) {
            sum += parseInt($(this).val());
        }
    });
    if (sum === 0) {
        alert('Need to enter a quantity!');
        return false;
    }


    var personalization_failed = false;
    form.find(".personalization-required").each(function() {
        if ($(this).val() == '') {
            var name = $(this).parent().find('.selected-name').text().slice(0, -1);
            alert(name+" is required.");
            personalization_failed = true;
        }
    });
    if(personalization_failed) return false;

    form.find("input[data-personalization-min],textarea[data-personalization-min]").each(function() {
        var rule = $(this).attr('data-personalization-min');
        if ($(this).val().length < rule) {
            var name = $(this).parent().find('.selected-name').text().slice(0, -1);
            alert(name+" should be at least "+rule+" characters.");
            personalization_failed = true;
        }
    });
    if(personalization_failed) return false;

    form.find("input[data-personalization-max],textarea[data-personalization-max]").each(function() {
        var rule = $(this).attr('data-personalization-max');
        if ($(this).val().length > rule) {
            var name = $(this).parent().find('.selected-name').text().slice(0, -1);
            alert(name+" is too long.");
            personalization_failed = true;
        }
    });
    if(personalization_failed) return false;

    // Disable submit button
    $('button[value=cart]').addClass('wait').attr('disabled',true);
    //console.log(form.serialize());

    $.post(acendaBaseUrl + '/product/route',
        form.serialize())
    .always(function() {
        // Make sure to reenable it, success or failure
        $('button[value=cart]').each(function() {
            $(this).removeClass('wait');
            // only enable the cart button if it wasn't disabled due to lack of Stock/Price
            if (!$(this).parents('.igq-mod').find('.quantity-selector').attr('disabled')) {
                $(this).attr('disabled',false);
            }
        });
		$('.modal-qv').modal('hide');
        $("html, body").animate({ scrollTop: 0 }, 600);
        $('#btn-qc').focus();
    })
    .fail(function() {
        // Set popover on failure to add items
        $('.quickcart .error').html('<p>Failed to add item(s) to cart.</p>');
    })
    //.done(ajaxCart);
});

function ajaxCart(data) {
	if ($(vData).find('.sku').length) {
		var dLID = $(vData).find('.sku span').text();
	} else {
		var dLID = $('.product-details .variations').attr('data-id');
	}
	if (typeof dataLayer !== "undefined" && pushdL == 1) {
		if (dataLayer !== null) {
			dataLayer.push({
				'event': 'addToCart',
				'ecommerce': {
					'currencyCode': 'USD',
					'add': {
						'products': [{
							'name': $(pData).find('.product-name').text(),
							'id': dLID,
							'price': $(vData).find('.price .val').text(),
							'brand': $(pData).find('.brand').text(),
							//'category': 'Apparel',
							//'variant': $(vData).attr('data-vid'),
							'quantity': $('.quantity-selector').val()
						}]
					}
				}
			});
		}
	}
	// BEGIN CONFIG VARIABLES
	var show_all = true; // Whether to show all products in ajax cart
	// END CONFIG VARIABLES

	var cart_items, cart_item_count = 0, cart_subtotal = 0; // Cart attributes

	// Check for items
	var result = $.parseJSON(data);

	$.ajax({
		dataType: "json",
		url: acendaBaseUrl + '/api/cart'
	})
	.done(function(data) {
		// Update cart count and create popover
		cart_items = data.result.items;
		cart_item_count = data.result.item_count;
		cart_subtotal = data.result.subtotal;
	})
	.then(function() {
		var first_product_added = false; // Whether it's the first product to be added to cart (determines whether to clone)
		var items = []; // Items array

		if (show_all) {
			items = cart_items;
		} else {
			//console.log('attempt not show_all');
			items = $('.productForm').serializeArray(); // Items that were added
		}

		if(items.length == 0) {
			Object.keys(result).forEach(function(id) {
				items.push({product_id:id, quantity:1});
			});
		}

		$('.ajaxcart-product:gt(0)').remove(); // Remove all but first ajaxcart-product (in case of multiple adds)

		for (var i = (items.length-1); i >= 0; i--) {
			var product_name = items[i].variant.name;
			if(typeof items[i].personalization != 'undefined') {
				for (var p in items[i].personalization) {
					// skip loop if the property is from prototype
					if (!items[i].personalization.hasOwnProperty(p)) continue;
					product_name += '<br>';
					product_name += items[i].personalization[p].name+': '+items[i].personalization[p].value;
				}
			}
			var product_price = parseFloat(items[i].variant.price).toFixed(2);
			var product_thumbnail = items[i].variant.thumbnail;

			if (!first_product_added) {
				$('.ajaxcart-product .img-product').attr('src', product_thumbnail);
				$('.ajaxcart-product .product-name').html(product_name);
				$('.ajaxcart-product .price .val').html(product_price);
				$('.ajaxcart-product .product-quantity').html(items[i].quantity);
				first_product_added = true;
			} else {
				var cloned = $('.ajaxcart-product:last').clone().appendTo('.ajaxcart-products');
				cloned.find('.img-product').attr('src', product_thumbnail);
				cloned.find('.product-name').html(product_name);
				cloned.find('.price .val').html(product_price);
				cloned.find('.product-quantity').html(items[i].quantity);
			}

			resetErrors();

			Object.keys(result).forEach(function(id) {
				if(result[id] == false || typeof result[id]['error'] != 'undefined') {
					var message = "<strong><u>Item Not Added.</u></strong>" + '</br>';
					if(typeof result[id]['error'] != 'undefined') {
						message += result[id]['error'][Object.keys(result[id]['error'])[0]][0];
					}
					var error = $('<div>', {"class": "alert alert-danger mt-3"}).html(message);
					errors.append(error);
				}
			});

		}
		$('.header .item-count').html(cart_item_count);
		$('.header .btn-qc .item-count').addClass('ready');
		$('.ajaxcart .subtotal .val').html(cart_subtotal);

		if (show_all) {
			$('.ajaxcart .heading').html('');
		} else
			$('.ajaxcart .heading').html('The following item(s) were added to your cart:');

		$('#collection .quantity-selector').val(0); // Set collection quantity selector values to 0
		$('#collection .btn-remove').attr('disabled',true)

		if(cart_items.length > 0) {
			displayCart();
		}
		//console.log('set qcrecalc to 0');
		qcrecalc = 0;
		pushdL = 0;
		//
		$('.productForm [value=cart]').each(function() {
			if ($(this).hasClass('virg')) {
				$(this).removeClass('virg');
				$(this).removeClass('wait');
				// only enable the cart button if it wasn't disabled due to lack of Stock/Price
				if (!$(this).parents('.igq-mod').find('.quantity-selector').attr('disabled')) {
					$(this).attr('disabled',false);
				}
				if (cartIsReadyYet == 0 && typeof cartIsReady === "function") {
					cartIsReady()
					cartIsReadyYet = 1
				}
			}
		});
	});
}

function displayCart(){
    //console.log('f displayCart(), add qc-ready');
    setTimeout(function() {
        $('.dropdown-qc').addClass('qc-ready');
    }, 50);
}

function resetErrors(){
    $('.ajaxcart .error').empty();
}
