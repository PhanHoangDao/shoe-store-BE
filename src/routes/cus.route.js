const express = require("express");
const router = express.Router();
const orderController = require("../app/controllers/orderController");
const cartController = require("../app/controllers/cartController");
const promotionalController = require("../app/controllers/promotionalController");
const shoeController = require("../app/controllers/shoeController");

router.get("/cart", cartController.getCart);
router.post("/cart/add", cartController.create);
router.put("/cart/update/:id", cartController.update);
router.delete("/cart/delete/:cartId", cartController.delete);

// get all and apply promotional
router.get("/promotion", promotionalController.availablePromotion);
router.put(
	"/applyPromo",
	promotionalController.applyPromo.bind(promotionalController)
);
// check out
router.post("/checkout", orderController.checkout.bind(orderController));

// checkout with paypal
router.post(
	"/checkout-payPal",
	orderController.checkoutPaypal.bind(orderController)
);

// get all order
router.get("/myOrder", orderController.getMyOrder);

// get my order
router.get("/myOrderDetail/:orderDetailId", orderController.getMyOrderDetail);

//cancel orders
router.delete("/cancelOrder/:orderId", orderController.cancelOrder);
// confirmed delivered
router.post(
	"/confirmDelivered/:orderId",
	orderController.customerConfirmedDelivered.bind(orderController)
);

router.get("/checkoutComplete", (req, res) => {
	res.render("checkoutComplete");
});
router.get("/wishList", (req, res) => {
	res.render("wishList");
});

// comment and rating
router.get("/getRate/:id", shoeController.getRate.bind(shoeController));

router.post(
	"/commentAndRate/:orderId",
	shoeController.commentAndRate.bind(shoeController)
);

router.put(
	"/editComment/:id",
	shoeController.editCommentAndRate.bind(shoeController)
);

module.exports = router;
