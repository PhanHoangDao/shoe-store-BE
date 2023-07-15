const Account = require("../models/account.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const jwtHelp = require("../../utils/jwtHelp");
const {
	mutipleMongooseToObject,
	mongooseToObject,
} = require("../../utils/mongoose");
const mailService = require("../../services/mailService.js");
const accountHelp = require("../../utils/accountHelp");
const promotionalController = require("./promotionalController");
require("dotenv").config();

class accountController {
	/**
	 * @swagger
	 * components:
	 *   schemas:
	 *     handleLogin:
	 *       type: object
	 *       properties:
	 *         accountName:
	 *           type: string
	 *           description: The account's name'.
	 *           example: testAccountName
	 *         password:
	 *           type: string
	 *           description: The account's password.
	 *           example: 12345678
	 */

	// [POST] /account/handleAdminLogin
	handleAdminLogin(req, res) {
		Account.findOne({ email: req.body.email }).then(async (account) => {
			//check account
			account = mongooseToObject(account);
			const result = bcrypt.compareSync(req.body.password, account.password);
			if (result) {
				jwtHelp.encodeAndStoreTokenAdmin(
					account.userId,
					account.permission,
					account.fullname,
					account.picture,
					res
				);
				return res.redirect("/admin");
			}
		});
	}

	/**
	 * @swagger
	 * /auth/login:
	 *   post:
	 *     summary: User Login.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             $ref: '#/components/schemas/handleLogin'
	 *     responses:
	 *       201:
	 *         description: Login payload.
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  token:
	 *                    type: string
	 *                    description: The accessToken.
	 *                  refreshToken:
	 *                    type: string
	 *                    description: The refreshToken to refresh token.
	 *       400:
	 *         description: Login failed
	 */
	async handleCustomerLogin(req, res) {
		try {
			let user = await Account.findOne({ accountName: req.body.accountName });
			if (user) {
				user = mongooseToObject(user);
				const result = bcrypt.compareSync(req.body.password, user.password);
				if (result) {
					const tokens = jwtHelp.encodeAndStoreToken(
						user._id,
						user.permission,
						user.fullname
					);
					const expired_at = new Date().setDate(new Date().getDate() + 3);
					res.status(200).send({ tokens, user, expired_at });
				} else {
					res.status(400).send("Your password is incorrect. Please try again");
				}
			} else {
				res
					.status(400)
					.send("Your account name is incorrect. Please try again");
			}
		} catch (err) {
			console.log(err);
			res.status(400).send("Invalid input");
		}
	}

	/**
	 * @swagger
	 * /auth/register:
	 *   post:
	 *     summary: User Register.
	 *     tags: [Customer Service]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                fullname:
	 *                  type: string
	 *                  description: The user's id.
	 *                  example: catledeptrai
	 *                email:
	 *                  type: string
	 *                  description: Email's account.
	 *                  example: catle4552@gmail.com
	 *                accountName:
	 *                  type: string
	 *                  description: AccountName's account.
	 *                  example: testAccountName
	 *                password:
	 *                  type: string
	 *                  description: Password's account.
	 *                  example: 12345678
	 *                address:
	 *                  type: string
	 *                  description: Account's address.
	 *                  example: Ho Chi Minh
	 *                numberPhone:
	 *                  type: string
	 *                  description: Account's number phone.
	 *                  example: 0924812421
	 *     responses:
	 *       201:
	 *         description: Login payload.
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  token:
	 *                    type: string
	 *                    description: The accessToken.
	 *                  refreshToken:
	 *                    type: string
	 *                    description: The refreshToken to refresh token.
	 *       400:
	 *         description: Login failed
	 */
	async handleCustomerRegister(req, res) {
		req.body.permission = "2";
		req.body.userId = new mongoose.Types.ObjectId().toString();
		const existedAccount = await Account.findOne({
			accountName: req.body.accountName,
		});
		if (existedAccount) {
			return res
				.status(400)
				.send({ message: "Account Name already existed. Please try again." });
		}
		const newAccount = new Account(req.body);

		// send email to new account
		const existedEmail = await Account.findOne({
			email: req.body.email,
		});
		if (!existedEmail) {
			const promoCode = await promotionalController.promoFirstLogin(
				req.body.userId
			);
			mailService.sendMailForFirstLogin(req.body.email, promoCode);
		}

		newAccount
			.save()
			.then(() => {
				res.status(201).send("Success");
			})
			.catch((err) => {
				console.log(err);
				res.status(400).send("Invalid input");
			});
	}

	/**
	 * @swagger
	 * /auth/google:
	 *   post:
	 *     summary: Login by Google.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                userId:
	 *                  type: string
	 *                  description: The user's id.
	 *                  example: 111296478107459073277
	 *                fullname:
	 *                  type: string
	 *                  description: Full name of user.
	 *                  example: storage Byme
	 *                email:
	 *                  type: string
	 *                  description: Email's account.
	 *                  example: storage1520@gmail.com
	 *                picture:
	 *                  type: string
	 *                  description: Account's avatar.
	 *                  example: https://lh3.googleusercontent.com/a/AGNmyxYnpqJEjGcwvQCVTN0_utC29d7zN6xWpNvpblxy=s96-c
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  token:
	 *                    type: string
	 *                  user:
	 *                    type: object
	 *                    properties:
	 *                       userId:
	 *                         type: string
	 *                       email:
	 *                         type: string
	 *                       fullname:
	 *                         type: string
	 *                       picture:
	 *                         type: string
	 *                       permission:
	 *                         type: integer
	 *       400:
	 *         description: Error
	 */
	async handleLoginGoogle(req, res) {
		accountHelp.handleLoginOauth(req, res, "google");
	}

	/**
	 * @swagger
	 * /auth/facebook:
	 *   post:
	 *     summary: Login by facebook.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                userId:
	 *                  type: string
	 *                  description: The user's id.
	 *                fullname:
	 *                  type: string
	 *                  description: Full name of user.
	 *                email:
	 *                  type: string
	 *                  description: Email's account.
	 *                picture:
	 *                  type: string
	 *                  description: Account's avatar.
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  token:
	 *                    type: string
	 *                  user:
	 *                    type: object
	 *                    properties:
	 *                       userId:
	 *                         type: string
	 *                       email:
	 *                         type: string
	 *                       fullname:
	 *                         type: string
	 *                       picture:
	 *                         type: string
	 *                       permission:
	 *                         type: integer
	 *       400:
	 *         description: Error
	 */
	async handleLoginFacebook(req, res) {
		accountHelp.handleLoginOauth(req, res, "facebook");
	}

	/**
	 * @swagger
	 * /auth/verifyToken:
	 *   post:
	 *     summary: Verify accessToken.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                token:
	 *                  type: string
	 *                  description: The access token.
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  token:
	 *                    type: string
	 *                    description: Verify access token success.
	 *       400:
	 *         description: Verify access token failed
	 */
	authAccessToken(req, res) {
		jwtHelp.authAccessToken(req, res);
	}
	/**
	 * @swagger
	 * /auth/refreshToken:
	 *   post:
	 *     summary: Refresh accessToken.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *                refreshToken:
	 *                  type: string
	 *                  description: The refresh token.
	 *     responses:
	 *       201:
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                  token:
	 *                    type: string
	 *                    description: The accessToken from refresh.
	 *       400:
	 *         description: Refresh failed
	 */
	renewAccessToken(req, res) {
		jwtHelp.renewAccessToken(req, res);
	}

	// encode token of user when they authenticate successful from facebook or google
	encodeAndStoreToken(req, res) {
		// encode token and store accessToken and refreshToken to cookie
		jwtHelp.encodeAndStoreToken(
			req.user.userId,
			req.user.permission,
			req.user.fullname,
			req.user.picture,
			res
		);
		res.redirect("/auth/testAuth");
	}
	// after authenticate successful by google account
	testAuth(req, res) {
		res.json(req.cookies.userInfo);
	}

	//logout function
	logout(req, res) {
		// req.logout();
		res.clearCookie("Authorization");
		res.clearCookie("refreshToken");
		res.clearCookie("userInfo");
		res.redirect("/");
	}

	manager(req, res, next) {
		Account.find()
			.then((accounts) => {
				res.render("adminPages/account/manager", {
					accounts: mutipleMongooseToObject(accounts),
					layout: "adminLayout",
				});
			})
			.catch((err) => {
				next(err);
			});
	}

	// [GET] /accounts/renderCreate
	renderCreate(req, res) {
		if (req.query != "warning") delete req.session.errImage;
		res.render("adminPages/account/addAccount", {
			layout: "adminLayout",
		});
	}

	// [GET] /accounts/update/:id
	renderUpdate(req, res) {
		Account.findById({ _id: req.params.id })
			.then((account) => {
				res.render("adminPages/account/accountUpdate", {
					account: mongooseToObject(account),
					layout: "adminLayout",
				});
			})
			.catch((err) => console.log(err));
	}

	//[POST] /accounts/save
	async create(req, res) {
		req.body.authType = "local";
		const existedAccount = await Account.findOne({
			accountName: req.body.accountName,
		});
		if (existedAccount) {
			// url for redirect back
			const backUrl = req.header("Referer") || "/";
			//throw error for the view...
			req.session.errText =
				"This account name already existed. Please try again.";
			return res.redirect(backUrl + "?warning");
		}
		const newAccount = new Account(req.body);
		newAccount
			.save()
			.then(() => {
				res.redirect("/admin/accounts");
			})
			.catch((err) => {
				console.log(err);
				res.redirect("/admin/accounts");
			});
	}

	//[PUT] /accounts/update/:id
	update(req, res, next) {
		Account.updateOne({ _id: req.params.id }, req.body)
			.then(() => {
				res.redirect(`/admin/accounts`);
			})
			.catch((err) => {
				console.log(err);
			});
	}

	//[DELETE] /accounts/delete/:id
	delete(req, res) {
		Account.deleteOne({ _id: req.params.id })
			.then(() => {
				res.redirect("back");
			})
			.catch((err) => {
				console.log(err);
			});
	}
}

module.exports = new accountController();
