const { senderEmail, pass } = require("../constants/mail");
const nodemailer = require("nodemailer");

class mailService {
	sendMailAfterCheckout(emailReceiver, promoCode) {
		const subject = "Thanks for your order";
		const html = `
			<span>Check out success and here is your promotion for next order. Thanks for your order</span>
			<h1>${promoCode}</h1>
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
