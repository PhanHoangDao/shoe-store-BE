const express = require("express");
const router = express.Router();
// const accountController = require("../app/controllers/orderController");
const accountController = require("../app/controllers/accountController");

router.get("/", (req, res) => {
	res.render("adminPages/adminLogin", { layout: false });
});

router.get("/logoutAdmin", (req, res) => {
	res.clearCookie("Authorization");
	res.clearCookie("refreshToken");
	res.clearCookie("userInfo");

	res.redirect("/");
});
router.post("/handleAdminLogin", accountController.handleAdminLogin);

module.exports = router;
