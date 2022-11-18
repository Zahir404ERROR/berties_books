module.exports = function (app, shopData) {
    const redirectLogin = (req, res, next) => {
        if (!req.session.userId) {
            res.redirect('./login')
        } else { next(); }
    }

    const { check, validationResult } = require('express-validator');

    // Handle our routes

    // Home Page
    app.get('/', function (req, res) {
        usrId = req.session.userId;
        let newData = Object.assign({}, shopData, usrId);
        res.render('index.ejs', newData)
    });

    // About Page
    app.get('/about', function (req, res) {
        res.render('about.ejs', shopData);
    });

    // Search Books
    app.get('/search', redirectLogin, function (req, res) {
        res.render("search.ejs", shopData);
    });

    app.get('/search-result', [check('keyword').notEmpty()], function (req, res) {
        //searching in the database
        //res.send("You searched for: " + req.query.keyword);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.redirect('./search');
        }
        else {
        let sqlquery = "SELECT * FROM books WHERE name LIKE '%" + req.sanitize(req.query.keyword) + "%'"; // query database to get all the books
        // execute sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./');
            }
            let newData = Object.assign({}, shopData, { availableBooks: result });
            console.log(newData)
            res.render("list.ejs", newData)
        });
    }
    });

    // List Books
    app.get('/list', redirectLogin, function (req, res) {
        let sqlquery = "SELECT * FROM books"; // query database to get all the books
        // execute sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./');
            }
            let newData = Object.assign({}, shopData, { availableBooks: result });
            console.log(newData)
            res.render("list.ejs", newData)
        });
    });

    // Add Books
    app.get('/addbook', redirectLogin, function (req, res) {
        res.render('addbook.ejs', shopData);
    });

    app.post('/bookadded',
        [
            check('bname').notEmpty(),
            check('bprice')
                .notEmpty()
                .isNumeric()
        ], function (req, res) {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.redirect('./addbook');
            }
            else {
                // saving data in database
                let sqlquery = "INSERT INTO books (name, price) VALUES (?,?)";
                // execute sql query
                let newrecord = [req.sanitize(req.body.bname), req.sanitize(req.body.bprice)];
                db.query(sqlquery, newrecord, (err, result) => {
                    if (err) {
                        return console.error(err.message);
                    }
                    else
                        res.send(' This book is added to database, name: ' + req.body.name + ' price ' + req.body.price);
                });
            }
        });

    // Bargain Books
    app.get('/bargainbooks', redirectLogin, function (req, res) {
        let sqlquery = "SELECT * FROM books WHERE price < 20";
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./');
            }
            let newData = Object.assign({}, shopData, { availableBooks: result });
            console.log(newData)
            res.render("bargains.ejs", newData)
        });
    });

    // User Registration
    app.get('/register', function (req, res) {
        res.render('register.ejs', shopData);
    });

    app.post('/registered', [
        check('email').isEmail(),
        check('pass').isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
            returnScore: false,
            pointsPerUnique: 1,
            pointsPerRepeat: 0.5,
            pointsForContainingLower: 10,
            pointsForContainingUpper: 10,
            pointsForContainingNumber: 10,
            pointsForContainingSymbol: 10
        }),
        check('user')
            .notEmpty()
            .isAlphanumeric('en-US', { ignore: '\s' }),
        check('first')
            .notEmpty()
            .isAlpha('en-US', { ignore: '\s' }),
        check('last')
            .notEmpty()
            .isAlpha('en-US', { ignore: '\s' })
    ], function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.redirect('./register');
        }
        else {
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            const plainPassword = req.body.pass;

            // Hash Passwords
            bcrypt.hash(plainPassword, saltRounds, function (err, hashedPassword) {
                // query database to register user with hashed password
                let sqlquery = "INSERT INTO users (username, firstname, lastname, email, hashedpassword) VALUES (?,?,?,?,?)";
                // execute sql query
                let newrecord = [req.sanitize(req.body.user), req.sanitize(req.body.first), req.sanitize(req.body.last), req.sanitize(req.body.email), req.sanitize(hashedPassword)];
                db.query(sqlquery, newrecord, (err, result) => {
                    if (err) {
                        // Error Handling
                        return console.error(err.message);
                    }
                    else
                        // User Feedback    
                        result = 'Hello ' + req.body.first + ' ' + req.body.last + ' you are now registered! We will send an email to you at ' + req.body.email;
                    result += ' Your hashed password is: ' + hashedPassword;
                    // Stylesheets
                    result += '<link rel="stylesheet"  type="text/css" href="main.css" />'
                    // Quick Links for navigation
                    result += '<p><a href="register">Back</a> </p> <p><a href="./">Home</a></p>';
                    res.send(result);
                });
            })
        }
    });

    // List users
    app.get('/listusers', redirectLogin, function (req, res) {
        // query database to get all the users and no passwords
        let sqlquery = "SELECT username, firstname, lastname, email FROM users";
        // execute sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./');
            }
            let newData = Object.assign({}, shopData, { availableUsers: result });
            res.render("listusers.ejs", newData)
        });
    });

    // User Deletion
    app.get('/deleteusers', redirectLogin, function (req, res) {
        // Query database to get all users for selector
        let sqlquery = "SELECT * FROM users";
        // Execute sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect("/");
            }
            let newData = Object.assign({}, shopData, { availableUsers: result });
            res.render('deleteusers.ejs', newData);
        });
    });

    app.post('/deleted', redirectLogin, function (req, res) {
        // saving data in database
        let sqlquery = " DELETE FROM users WHERE username = '" + req.body.usrname + "'";
        // execute sql query
        db.query(sqlquery, (err, result) => {
            if (err) {
                return console.error(err.message);
            }
            else {
                // User Feedback  
                result = 'The usere entered has been successfully deleted from the database ( Username : ' + req.body.usrname + ')';
                // Stylesheets
                result += '<link rel="stylesheet"  type="text/css" href="main.css" />'
                // Quick Links for navigation
                result += '<p><a href="deleteusers">Back</a></p> <p><a href="./">Home</a></p>';
                res.send(result);
            }
        });
    });

    // User Login
    app.get('/login', function (req, res) {
        res.render('login.ejs', shopData);
    });

    app.post('/loggedin', [
        check('user')
            .notEmpty()
            .isAlphanumeric('en-US', { ignore: '\s' }),
        check('pass').notEmpty(),
    ], function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.redirect('./login');
        }
        else {
        // Compare the password supplied with the password in the database
        let sqlquery = "SELECT * FROM users WHERE username = '" + req.body.user + "'";
        // execute sql query
        console.log("req.body.username " + req.body.user);
        db.query(sqlquery, (err, result) => {
            if (err) {
                res.redirect('./');
            }
            else if (result.length == 0) {
                // incorrect User Password Feedback
                result = 'The username you entered is incorrect';
                // Stylesheets
                result += '<link rel="stylesheet"  type="text/css" href="main.css" />'
                // quick Links for navigation
                result += '<p><a href="login">Back</a></p> <p><a href="./">Home</a></p>';
                res.send(result);
            }
            else {
                const bcrypt = require('bcrypt');
                const saltRounds = 10;
                const hashPassword = result[0].hashedpassword;
                bcrypt.compare(req.body.pass, hashPassword, function (err, bcryptresult) {
                    if (err) {
                        // Error Handling
                        return console.error(err.message);
                    }
                    else if (bcryptresult == true) {
                        req.session.userId = req.body.user;
                        // Successful User Login Feedback
                        bcryptresult = '<link rel="stylesheet"  type="text/css" href="main.css" />';
                        // Stylesheets
                        bcryptresult += 'Hello ' + req.body.user + ' you have successfully logged in!'
                        // Quick Links for navigation
                        bcryptresult += '<p><a href="login">Back</a></p> <p><a href="./">Home</a></p>';
                        res.send(bcryptresult);
                    }
                    else {
                        // Incorrect User Password Feedback
                        bcryptresult = 'Hello ' + req.body.user + ' the password you entered is incorrect!';
                        // Stylesheets
                        bcryptresult += '<link rel="stylesheet"  type="text/css" href="main.css" />'
                        // Quick Links for navigation
                        bcryptresult += '<p><a href="login">Back</a></p> <p><a href="./">Home</a></p>';
                        res.send(bcryptresult);
                    }
                });
            }
        });
    }
    });

    app.get('/logout', redirectLogin, (req, res) => {
        req.session.destroy(err => {
            if (err) {
                return res.redirect('./')
            }
            res.send('<link rel="stylesheet" type="text/css" href="main.css" /> You are now logged out. <p><a href=' + './' + '>Home</a> </p>');
        })
    })
}