const Account = require("../app/models/account.model");
const jwtHelp = require("./jwtHelp");
const mailService = require("../services/mailService");
const promotionalController = require("../app/controllers/promotionalController");

module.exports = {
	hasExistAccountName: (req, res, next) => {
		Account.find({
			$and: [{ accountName: req.body.accountName }, { permission: "2" }],
		})
			.then((accounts) => {
				if (accounts.length > 0) {
					console.log("accounts", accounts);
					// const backUrl = req.header("Referer") || "/";
					// req.session.registerErr =
					// 	"This accountName is existing. Please choose a other accountName";
					return res.status(400).send({
						message:
							"This accountName is already exist. Please choose another accountName",
					});
				}
				next();
			})
			.catch((err) => {
				console.log(err);
				res.status(400).send("Invalid input");
			});
	},
	handleLoginOauth: async (req, res, authType) => {
		try {
			//User exist
			const existUser = await Account.findOne({ userId: req.body.userId });
			const existEmail = await Account.findOne({ email: req.body?.email });
			const expired_at = new Date().setDate(new Date().getDate() + 3);

			// create new account and send email include promotion
			if (!existUser) {
				const newUser = new Account({
					fullname: req.body.fullname,
					userId: req.body.userId,
					email: req.body?.email,
					address: "",
					numberPhone: "",
					permission: "2",
					authType: authType,
					picture: req.body.picture,
				});
				await newUser.save();
				if (!existEmail) {
					const promoCode = await promotionalController.promoFirstLogin(
						newUser._id
					);
					mailService.sendMailForFirstLogin(req.body?.email, promoCode);
				}
				const token = jwtHelp.createAccessToken(
					newUser._id,
					newUser.permission,
					newUser.fullname
				);

				return res.json({ token, newUser, expired_at });
			}

			// always update info of user when account user is exist
			Account.findOneAndUpdate(
				{ userId: req.body.userId },
				req.body,
				{
					returnDocument: "after",
				},
				(err, userUpdated) => {
					const token = jwtHelp.createAccessToken(
						userUpdated._id,
						userUpdated.permission,
						userUpdated.fullname
					);
					res.json({ token, userUpdated, expired_at });
				}
			);
		} catch (err) {
			res.status(400).send();
		}
	},
};
