require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyparser = require("body-parser");
const app = express();
const mongoose = require("mongoose");
const bcrypt= require('bcrypt');
const saltround = 10;
const findOrCreate = require('mongoose-findorcreate');
require('dotenv').config();



const session = require("express-session");
const passport = require("passport");
const passportlocalmongoose = require("passport-local-mongoose");



const GoogleStrategy = require('passport-google-oauth20').Strategy;



app.use(bodyparser.urlencoded({extended:true}));
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(session({
    secret : "Ahad Khan",
    resave : false,
    saveUninitialized : false
}));
app.use(passport.initialize());
app.use(passport.session());




mongoose.connect("mongodb://localhost:27017/userDB",{
    useNewUrlParser:true, 
    useUnifiedTopology: true
});
const userSchema= new mongoose.Schema({
    username:String,
    password:String,
    googleId:String,
    secrets:String
});

userSchema.plugin(passportlocalmongoose);
userSchema.plugin(findOrCreate);




var Users= new mongoose.model("user",userSchema);

passport.use(Users.createStrategy());
 
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    Users.findById(id, function(err, user) {
      done(err, user);
    });
  });


passport.use(new GoogleStrategy({
    clientID: process.env.Client_id,
    clientSecret: process.env.Client_Secrets,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    Users.findOrCreate({ googleId: profile.id }, function (err, user) {
        
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
    res.render("home");
});

app.get("/login",function(req,res){
    res.render("login");
});


app.get("/logout",(req,res)=>{
    req.logout();
    res.redirect("/");
});


app.post("/login",function(req,res){

    var logindetails = new Users ({
        username : req.body.username,
        password : req.body.password
    });
    
    req.login(logindetails , (err)=>{
        if(err){
            console.log(err);
            console.log("ahad")
        }
        else
        {
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            });
        }

    });
    
    });
    

app.get("/register",function(req,res){
    res.render("register");
    
});

app.post("/register",function(req,res){
    Users.register({username : req.body.username} , req.body.password , function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");

        }
        else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            });
        }

    });
    
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
  
  );


app.get('/auth/google/secrets', 
 passport.authenticate('google', { failureRedirect: '/login' }),
function(req, res) {
    // Successful authentication, redirect to secrets.
    console.log("runiing");
    res.redirect('/secrets');
  });


app.get("/secrets",(req,res)=>{
   Users.find({secrets : {$ne : null}}, (err,secrets)=>{
     if (err){
        console.log(err);
     }
     else{
         res.render("secrets.ejs", { secretData : secrets});
     }
   });
});


app.get("/submit",(req,res)=>{
    if(req.isAuthenticated())
   res.render("submit.ejs");
   else
   res.redirect("/login");
});

app.post("/submit",(req,res)=>{
   Users.findById(req.user._id,(err,foundUser)=>{
     if(err){
         console.log(err);
         
     }
     else{
         if(foundUser){
             foundUser.secrets = req.body.secret;
             foundUser.save();
             res.redirect("/secrets");
         }
     }
   });
});







app.listen(3000,function(req,res){
    console.log("Server is running on port 3000");
})
