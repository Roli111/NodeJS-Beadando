const passport=require('passport');
const LocalStrategy=require('passport-local').Strategy;
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const mysql = require('mysql2');
const crypto=require('crypto');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);

/*Mysql Express Session*/
app.use(session({
	key: 'session_cookie_name',
	secret: 'session_cookie_secret',
	store: new MySQLStore({
        host:'localhost',
        user:'root',
        password: "",
        database:'user'
    }),
	resave: false,
    saveUninitialized: false,
    cookie:{
        maxAge:1000*60*60*24,
    }
}));
// inicializáljuk a passport.js-t
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
//css fájlok a public mappában tárolódnak
app.use(express.static('public'));
//ejs-t használunk nézetmotorként
app.set("view engine", "ejs");

//Kapcsolódás az adatbázishoz
var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "user",
    multipleStatements: true
  });
  connection.connect((err) => {
    if (!err)
      console.log("Connected");
    else 
      console.log("Connection Failed");
});
 
const customFields={
    usernameField:'uname',
    passwordField:'pw',
};

/*Passport JS*/
const verifyCallback=(username,password,done)=>{
     connection.query('SELECT * FROM users WHERE username = ? ', [username], function(error, results, fields) {
        if (error) 
            return done(error);
        if(results.length==0)
            return done(null,false);
        const isValid=validPassword(password,results[0].hash);
        user={id:results[0].id,username:results[0].username,hash:results[0].hash};
        if(isValid)
            return done(null,user);
        else
            return done(null,false);
    });
}
function validPassword(password,hash)
{
    return hash === crypto.createHash('sha512').update(password).digest('hex');
}

const strategy=new LocalStrategy(customFields,verifyCallback);
passport.use(strategy);

passport.serializeUser((user,done)=>{
    console.log("inside serialize");
    done(null,user.id)
});

passport.deserializeUser(function(userId,done){
    console.log('deserializeUser'+ userId);
    connection.query('SELECT * FROM users where id = ?',[userId], function(error, results) {
            done(null, results[0]);    
    });
});

app.use((req,res,next)=>{
    console.log("\n"+req.url);
    console.log(req.session);
    console.log(req.user);
    next();
});

app.get('/', (req, res, next) => {
    auth=false
    username=""
    admin=false
    if(req.isAuthenticated()){
        auth=true
        username=req.user.username
    }
    if(req.isAuthenticated() && req.user.isAdmin==1)
        admin=true
    res.render("mainpage", {
        isAuth: auth, isAdmin: admin, username: username
   });
});

app.get('/register', (req, res, next) => {
    console.log("Inside get");
    res.render('register')
});

app.post('/register',userExists,(req,res,next)=>{
    console.log("Inside post");
    console.log(req.body.pw);
    const hash=genPassword(req.body.pw);
    console.log(hash);
    connection.query('Insert into users(username,hash,isAdmin) values(?,?,0) ', [req.body.uname,hash], function(error, results, fields) {
        if (error) 
            console.log("Error");
        else
            console.log("Successfully Entered");
    });
    res.redirect('/login');
});

function userExists(req,res,next)
{
    connection.query('Select * from users where username=? ', [req.body.uname], function(error, results, fields) {
        if (error) 
            console.log("Error");
        else if(results.length>0)
            res.redirect('/userAlreadyExists')
        else
            next();
    });
}

app.get('/userAlreadyExists', (req, res, next) => {
    console.log("Inside get");
    res.send('<h1>Sorry This username is taken </h1><p><a href="/register">Register with different username</a></p>');
});

function genPassword(password)
{
    return crypto.createHash('sha512').update(password).digest('hex');
}

app.get('/login', (req, res, next) => {
        res.render('login')
});

app.post('/login',passport.authenticate('local',{failureRedirect:'/login-failure',successRedirect:'/login-success'}));

app.get('/login-failure', (req, res, next) => {
    res.send('You entered the wrong password.');
});

app.get('/login-success', (req, res, next) => {
    res.redirect('/protected-route');
});

app.get('/protected-route',isAuth,(req, res, next) => {
    admin=false
    if(req.isAuthenticated() && req.user.isAdmin==1)
        admin=true
    res.render("protected", {
        isAdmin: admin, username: req.user.username
   });
});

function isAuth(req,res,next)
{
    if(req.isAuthenticated())
        next();
    else
        res.redirect('/notAuthorized');
}

app.get('/notAuthorized', (req, res, next) => {
    console.log("Inside get");
    res.send('<h1>You are not authorized to view the resource </h1><p><a href="/login">Retry Login</a></p>');
    
});

app.get('/logout', function(req, res, next) {
  req.session.destroy(function (err) {
    res.clearCookie('session_cookie_name');
    res.redirect('/'); 
  });
});

app.get('/admin-route',isAdmin,(req, res, next) => {
    res.render("admin", {
        userName: req.user.username
   });
});

function isAdmin(req,res,next)
{
    if(req.isAuthenticated() && req.user.isAdmin==1)
        next();
    else
        res.redirect('/notAuthorizedAdmin');   
}

app.get('/notAuthorizedAdmin', (req, res, next) => {
    console.log("Inside get");
    res.send('<h1>You are not authorized to view the resource as you are not the admin of the page  </h1><p><a href="/login">Retry to Login as admin</a></p>');
    
});

app.listen(3000, function() {
    console.log('App listening on port 3000!')
});

// Kapcsolódás a tanosveny adatbázishoz
const tanosvenyDb = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "tanosveny"
});

tanosvenyDb.connect((err) => {
    if (!err)
        console.log("Connected to tanosveny DB");
    else 
        console.log("Connection to tanosveny DB Failed");
});

// Útvonal a /adatbazis oldalhoz
app.get('/adatbazis', (req, res) => {
    const sql = `
        SELECT ut.*, telepules.nev AS telepulesNev, np.nev AS npNev
        FROM ut
        JOIN telepules ON ut.telepulesid = telepules.id
        JOIN np ON telepules.npid = np.id
    `;
    tanosvenyDb.query(sql, (err, results) => {
        if(err) {
            console.log(err);
            res.status(500).send('Hiba az adatbázis lekérdezés közben');
        } else {
            res.render('adatbazis', { tanosvenyek: results });
        }
    });
});


// Kapcsolódás a kapcsolat üzenetek 

const kapcsolatDb = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "kapcsolat"
});

kapcsolatDb.connect((err) => {
    if(!err) console.log("Kapcsolat adatbázishoz csatlakozva!");
    else console.log("Hiba a kapcsolat adatbázishoz való csatlakozáskor:", err);
});
// Főoldal (példa, mainpage.ejs)
app.get('/', (req, res) => {
    res.render('mainpage');
});
// Üzenet mentése a kapcsolat adatbázisba
app.post('/kapcsolat', (req, res) => {
    const { nev, email, uzenet } = req.body;

    if (!nev || !email || !uzenet) {
        return res.send('Kérlek töltsd ki az összes mezőt!');
    }

    const sql = 'INSERT INTO messages (nev, email, uzenet) VALUES (?, ?, ?)';
    kapcsolatDb.query(sql, [nev, email, uzenet], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Hiba az üzenet mentése közben');
        } else {
            res.send('<h2>Köszönjük az üzeneted!</h2><p><a href="/">Vissza a főoldalra</a></p>');
        }
    });
});

app.get('/uzenetek', isAuth, (req, res) => {
    const sql = 'SELECT * FROM messages ORDER BY datum DESC';
    kapcsolatDb.query(sql, (err, results) => {
        if(err){
            console.log("Hiba az üzenetek lekérésekor:", err.sqlMessage);
            return res.status(500).send('Hiba az üzenetek lekérésekor');
        }
        res.render('uzenetek', { messages: results });
    });
});

