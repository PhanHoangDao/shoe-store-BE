const paypal = require("paypal-rest-sdk");
const URL_REDIRECTS = require("../constants/urlRedirect");

// paypal configure
paypal.configure({
	mode: "sandbox",
	client_id: process.env.PAYPAL_CLIENT_ID,
	client_secret: process.env.PAYPAL_SECRET_KEY,
});

const setUpPayment = (listCart, discount, userId, orderId) => {
	let price = 0;
	const listCartHandle = listCart.flatMap((cart) =>
		Array.from({ length: cart.quantity }, () => ({
			name: cart.productName,
			price: cart.productPrice,
			currency: "USD",
			quantity: 1,
		}))
	);

	const items = listCartHandle.map((item) => {
		if (!Number(discount.totalDiscount) > 0) {
			return {
				name: item.name,
				price: Number(item.price).toFixed(2),
				currency: "USD",
				quantity: item.quantity,
			};
		}

		if (discount.totalDiscount > item.price) {
			discount.totalDiscount -= Number(item.price) * Number(item.quantity);
			return {
				name: item.name,
				price: Number(0).toFixed(2),
				currency: "USD",
				quantity: item.quantity,
			};
		} else {
			price = Number(item.price) - Number(discount.totalDiscount);
			discount.totalDiscount = 0;
			return {
				name: item.name,
				price: Number(price).toFixed(2),
				currency: "USD",
				quantity: item.quantity,
			};
		}
	});

	const create_payment_json = {
		intent: "sale",
		payer: {
			payment_method: "paypal",
		},
		redirect_urls: {
			return_url: URL_REDIRECTS.backendHost,
			cancel_url: URL_REDIRECTS.frontendHost,
		},
		transactions: [
			{
				item_list: {
					items,
				},
				amount: {
					currency: "USD",
					total: discount.totalMoney.toFixed(2),
				},
				description: `This is the payment for orderId: ${orderId}.`,
				custom: userId,
			},
		],
	};

	return create_payment_json;
};

module.exports = {
	paypal,
	setUpPayment,
};
