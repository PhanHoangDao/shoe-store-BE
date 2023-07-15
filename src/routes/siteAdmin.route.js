const express = require("express");
const router = express.Router();
const accountController = require("../app/controllers/accountController");
const orderController = require("../app/controllers/orderController");

router.get("/", (req, res) => {
	if (req.cookies.Authorization) {
		return res.redirect("/admin/dashboard");
	}
	res.render("adminPages/adminLogin", { layout: false });
});

// handle result from paypal when success
router.get(
	"/result-paypal",
	orderController.handleResultPaypal.bind(orderController)
);

router.get("/logoutAdmin", (req, res) => {
	res.clearCookie("Authorization");
	res.clearCookie("refreshToken");
	res.clearCookie("userInfo");

	res.redirect("/");
});
router.post("/handleAdminLogin", accountController.handleAdminLogin);

module.exports = router;
