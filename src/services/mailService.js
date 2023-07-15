const {
	senderEmail,
	pass,
	mailReceiveOrderNotification,
} = require("../constants/mail");
const nodemailer = require("nodemailer");

class mailService {
	sendMailAfterCheckout(emailReceiver, dateTime) {
		const subject = "Thanks for your order";
		const html = `
			<span>Check out success, please wait for confirmation from admin. Thanks for your order</span>
			<h1>Date&Time: ${dateTime}</h1>
		`;
		this.sendMail(emailReceiver, html, subject);
	}

	sendMailAfterComplete(emailReceiver, promoCode, dateTime) {
		const subject = "Order Completed";
		const html = `
			<span>Order completed and here is your promotion for next order. Thanks for your order!</span>
			<h1>Date & Time: ${dateTime}</h1>
			<h1>Promotional: ${promoCode}</h1>
		`;
		this.sendMail(emailReceiver, html, subject);
	}

	sendMailForFirstLogin(emailReceiver, promoCode) {
		const subject = "Discount for first order";
		const html = `
			<span>Hi, here are your discount for first order. Please check it !</span>
			<h1>${promoCode}</h1>
		`;
		this.sendMail(emailReceiver, html, subject);
	}

	sendMailForAdmin(customerName, orderId, dateTime) {
		const subject = "Have a new Order";
		const html = `
			<span>Hi, Shoe Store have a new Order. Please check it !</span>
			<h1>Order of Customer: ${customerName}</h1>
			<h1>Order ID: ${orderId}</h1>
			<h1>Date & Time: ${dateTime}</h1>
		`;
		this.sendMail(mailReceiveOrderNotification, html, subject);
	}

	async sendMail(emailReceiver, content, subject) {
		let transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: senderEmail,
				pass: pass,
			},
		});

		let mailOptions = {
			from: senderEmail, // sender address
			to: emailReceiver, // list of receivers
			subject: subject, // Subject line
			text: "Hi! Here is your Code discount for first order", // plain text body
			html: content, // html body
		};

		await transporter.sendMail(mailOptions, (err, info) => {
			if (err) {
				console.log(err);
				return;
			}
			console.log("Email sent", info.response);
		});
	}
}

module.exports = new mailService();
