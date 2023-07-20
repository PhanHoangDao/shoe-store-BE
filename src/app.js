const express = require("express");
const cors = require("cors");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const fs = require("fs");
const http = require("http");

// swagger ui and swaggerJsDocs import
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("../swagger.json");
const swaggerJsDoc = require("swagger-jsdoc");

// method public (get/post/...) and json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//override method (Post, put, patch)
app.use(methodOverride("_method"));
//cookieParser
app.use(cookieParser());
//session
app.set("trust proxy", 1); // trust first proxy
app.use(
  session({
    secret: "SECRET",
    resave: false,
    saveUninitialized: true,
    cookie: {},
  })
);

//use cors
app.use(cors());

// database
const db = require("./config");
db.connect();

// express handlebars
const exphbs = require("express-handlebars");
const Handlebars = require("handlebars");
Handlebars.registerHelper("json", function (content) {
  return JSON.stringify(content);
});
Handlebars.registerHelper("inc", function (value, options) {
  return parseInt(value) + 1;
});
app.engine(
  ".hbs",
  exphbs({
    extname: ".hbs",
    helpers: {
      getCategoryAssigned: (
        listCateAdded,
        listCateOfShoe,
        listCateTypeAdded
      ) => {
        var output = "",
          nameOfType,
          flag = 0,
          cateAssigned;

        // console.log("listCateAdded", listCateAdded);
        // console.log("listCateOfShoe", listCateOfShoe);
        // console.log("listCateTypeAdded", listCateTypeAdded);

        for (typeIdAdded in listCateAdded) {
          cateAssigned = listCateOfShoe.find(
            (cate) => cate.typeId === typeIdAdded
          );
          if (cateAssigned) {
            for (cateType in listCateTypeAdded) {
              if (cateType === cateAssigned.typeId) {
                nameOfType = listCateTypeAdded[cateType][0].typeName;
                // first letter to upperCase
                output += `<div class="form-group">
										<label for="exampleInputEmail1">${
                      nameOfType.charAt(0).toUpperCase() + nameOfType.slice(1)
                    } of product</label>
										<select name="cateIds" class="form-control">`;
                flag = 1;
                break;
              }
            }

            // get cate selected of product
            listCateAdded[typeIdAdded].forEach((cateAdded) => {
              if (cateAdded.cateId.toString() === cateAssigned.cateId) {
                output += `<option value="${cateAdded.cateId}" selected>${
                  cateAdded.cateName.charAt(0).toUpperCase() +
                  cateAdded.cateName.slice(1)
                }</option>`;
              } else {
                output += `<option value="${cateAdded.cateId}">${
                  cateAdded.cateName.charAt(0).toUpperCase() +
                  cateAdded.cateName.slice(1)
                }</option>`;
              }
            });

            output += `</select>
							</div>
						`;
          } else {
            // CateType product not assigned
            flag = 0;
          }
        }

        // execute by last object
        if (flag === 0) {
          nameOfType =
            listCateTypeAdded[Object.keys(listCateAdded).pop()][0].typeName;

          // first letter to upperCase
          output += `<div class="form-group">
							<label for="exampleInputEmail1">${
                nameOfType.charAt(0).toUpperCase() + nameOfType.slice(1)
              } of product</label>
							<select name="cateIds" class="form-control">
								<option value="" selected>--- Select Category Of ${
                  nameOfType.charAt(0).toUpperCase() + nameOfType.slice(1)
                } ---</option>
							`;

          // get cate of this type
          listCateAdded[typeIdAdded].forEach((cateAdded) => {
            output += `<option value="${cateAdded.cateId}">${cateAdded.cateName}</option>`;
          });
          output += `</select>
								</div>
							`;
        }
        return new Handlebars.SafeString(output);
      },

      getAnotherCateAdded: (listType, listAnotherCate) => {
        var output = "",
          nameOfType = "";
        for (typeId in listType) {
          for (typeIdOfCate in listAnotherCate) {
            if (typeId === typeIdOfCate) {
              nameOfType = listType[typeId][0].typeName;
              output += `<div class="form-group">
											<label for="exampleInputEmail1">${
                        nameOfType.charAt(0).toUpperCase() + nameOfType.slice(1)
                      } of product</label>
											<select name="cateIds" class="form-control">
												<option value="" selected>--- Select Category Of ${
                          nameOfType.charAt(0).toUpperCase() +
                          nameOfType.slice(1)
                        } ---</option>`;

              // get all cate of this type
              listAnotherCate[typeIdOfCate].forEach((cate) => {
                output += `<option value="${cate.cateId}">${
                  cate.cateName.charAt(0).toUpperCase() + cate.cateName.slice(1)
                }</option>`;
              });
              output += `</select>
								</div>
							`;
            }
          }
        }
        return new Handlebars.SafeString(output);
      },

      getColorAssigned: (listColorAdded, listColorAssigned) => {
        let assigned, output;
        listColorAdded?.forEach((color) => {
          assigned = listColorAssigned.find(
            (colorInfo) => colorInfo.cateId === color.cateId.toString()
          );

          if (assigned) {
            output += `<option value="${color.cateId}" selected>${color.cateName}</option>`;
          } else {
            output += `<option value="${color.cateId}">${color.cateName}</option>`;
          }
        });
        return new Handlebars.SafeString(output);
      },

      getSizeInfo: (listSizeAdded, colorInfo) => {
        let isExited, output;
        listSizeAdded.forEach((size) => {
          isExited = colorInfo.listSizeByColor.find(
            (info) => info.sizeId === size.cateId.toString()
          );
          if (isExited) {
            output += `
						<div class ="form-check" style="margin-bottom: 14px">
							<input value="${size.cateId}" name="size${colorInfo.cateId}" type="hidden">
							<label class="form-check-label" for="flexCheckDefault" style="margin-right: 50px; min-width: 30px">
								${size.cateName}
							</label>
							<input type="number" name="amountOfSize${colorInfo.cateId}" placeholder="Enter amount of this size" value="${isExited.amount}" min="0">
							<label class="form-check-label" for="flexCheckDefault" style="margin-right: 10px; margin-left: 20px; min-width: 30px">Price</label>
							<input type="number" name="price${colorInfo.cateId}" placeholder="Enter price of this size" value="${isExited.price}" min="0"></input>
						</div>
						`;
          } else {
            output += `
						<div class ="form-check" style="margin-bottom: 14px">
							<input value="${size.cateId}" name="size${colorInfo.cateId}" type="hidden">
							<label class="form-check-label" for="flexCheckDefault" style="margin-right: 50px; min-width: 30px">
								${size.cateName}
							</label>
							<input type="number" name="amountOfSize${colorInfo.cateId}" placeholder="Enter amount of this size" value="0" min="0">
							<label class="form-check-label" for="flexCheckDefault" style="margin-right: 10px; margin-left: 20px; min-width: 30px">Price</label>
							<input type="number" name="price${colorInfo.cateId}" placeholder="Enter price of this size" value="0" min="0"></input>
						</div>
						`;
          }
        });

        return new Handlebars.SafeString(output);
      },

      formatCurrency: (price) => {
        return "$" + Number(price).toFixed(2);
      },

      setSubTotal: (quantity, price) => {
        return Number(quantity * price).toFixed(2);
      },

      getShoeName: (shoeIdOfOrderDetail, shoeId, shoeName) => {
        console.log("🚀 ~ file: app.js ~ line 84 ~ shoeId", shoeId);
        console.log(
          "🚀 ~ file: app.js ~ line 84 ~ shoeIdOfOrderDetail",
          shoeIdOfOrderDetail
        );
        var output = "";
        if (shoeId.toString() === shoeIdOfOrderDetail) {
          output = `<option value="${shoeId}" selected>${shoeName}</option>`;
        } else {
          output = `<option value="${shoeId}">${shoeName}</option>`;
        }
        return new Handlebars.SafeString(output);
      },
    },
  })
);

Handlebars.registerHelper(
  "when",
  function (operand_1, operator, operand_2, options) {
    var operators = {
        eq: function (l, r) {
          return l == r;
        },
        noteq: function (l, r) {
          return l != r;
        },
        gt: function (l, r) {
          return Number(l) > Number(r);
        },
        or: function (l, r) {
          return l || r;
        },
        and: function (l, r) {
          return l && r;
        },
        "%": function (l, r) {
          return l % r === 0;
        },
      },
      result = operators[operator](operand_1, operand_2);

    if (result) return options.fn(this);
    else return options.inverse(this);
  }
);

app.set("view engine", ".hbs");
app.set("views", "src/app/views");

// static route to public for user and admin
// app.use('/public', express.static('public'));
app.use(express.static(path.join(__dirname, "public")));

//Note: move it to json swagger config
// swaggerUi and swaggerJsDocs config
const options = {
  definition: {
    openapi: "3.0.0",
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "Bearer",
          bearerFormat: "JWT",
          in: "header",
        },
      },
      persistAuthorization: true,
    },
    info: {
      title: "Shoe Store API",
      version: "1.0.0",
      description: "A simple Express Library API",
      contact: {
        name: "Zion",
        email: "catle.pix@gmail.com",
      },
    },
    servers: [
      {
        url: "/api/v1",
      },
    ],
  },
  apis: [
    path.join(__dirname, "app/controllers/*.js"),
    path.join(__dirname, "app/models/*.js"),
    path.join(__dirname, "app/middlewares/*.js"),
  ],
};
const specs = swaggerJsDoc(options);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

app.use("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(specs);
});

// router
const route = require("./routes/index.route");
route(app);

// configure ssl server
// const sslServer = https.createServer(
// 	{
// 		key: fs.readFileSync("key.pem"),
// 		cert: fs.readFileSync("cert.pem"),
// 		// ca: fs.readFileSync(path.join(__dirname, "cert", "csr.pem")),
// 	},
// 	app
// );

const PORT = 3010;
http
  .createServer(app)
  .listen(PORT, () => console.log(`Secure server has started on port ${PORT}`));
module.exports = app;
