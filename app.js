//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');

// const encrypt=require("mongoose-encryption");

// const md5=require("md5");



// const bcrypt = require('bcrypt');
// const saltRounds = 10;

const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const app = express();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: 'Our little secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true});

  const userSchema=new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
  });

  userSchema.plugin(passportLocalMongoose);
  userSchema.plugin(findOrCreate);

  
  // userSchema.plugin(encrypt,{ secret : process.env.SECRET , encryptedFields: ["password"]});
const User=new mongoose.model("User",userSchema)
  passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

// passport.use(new GoogleStrategy({
//   clientID: process.env.CLIENT_ID,
//   clientSecret: process.env.CLIENT_SECRET,
//   callbackURL: "http://localhost:3000/auth/google/secrets",
//   userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
// },
// async function(accessToken, refreshToken, profile, cb) {
//   console.log(profile);
//   await User.findOne({ googleId: profile.id }, function (err, user) {
//     return cb(err, user);
//   });
//         // const googleId = profile.id;

//         // const existingUser = await User.findOne({googleId});

//         // if(existingUser){
//         //     //as u can notice i should return existingUser instaded of user
//         //     done(null, existingUser); // <------- i was returning undefined user here.
//         // }else{
//         //     const user = await User.create({ googleId});
//         //     done(null, user);
//         // }
// }
// ));

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/secrets'
},
async function (accessToken, refreshToken, profile, done) {
  try {
    console.log(profile);
    // Find or create user in your database
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      // Create new user in database
      const username = Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value.split('@')[0] : '';
      const newUser = new User({
        username: profile.displayName,
        googleId: profile.id
      });
      user = await newUser.save();
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}
));


  app.get("/",async function(req,res){
    res.render("home");
  });

  app.get("/auth/google",
  passport.authenticate("google",{scope: ['profile']}));

  // app.get(
  //   "/auth/google",
  //   (req, res, next) => {
  //     if (req.user) {
  //       console.log("user");
  //       res.redirect("/secrets");
  //     } else next();
  //   },
  //   passport.authenticate("google", {
  //     scope: ["profile"],
  //   })
  // );

app.get('/auth/google/secrets', 
  passport.authenticate("google", { failureRedirect: "/login" }),
  async function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });
  
  app.get("/login",async function(req,res){
    res.render("login");
  });
  
  app.get("/register",async function(req,res){
    res.render("register");
  });

  app.get("/secrets",async function(req,res){
    // if(await req.isAuthenticated())
    // {
    //   res.render("secrets");
    // }
    // else res.redirect("/login");

    const foundUsers=await User.find({"secret": {$ne: null}});
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
  });

  app.get("/submit", async function(req, res){
    if (await req.isAuthenticated()){
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  });

  app.post("/submit", async function(req, res){
    const submittedSecret = req.body.secret;
    const id1=req.body.id;
  
  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
    console.log(req.user.id);
  
   foundUser= await User.findById(req.user.id);
   if (foundUser) {
    foundUser.secret = submittedSecret;
    const uss=await foundUser.save();
    if(uss)
    res.redirect("/secrets");
  }
});
  
  app.get("/logout", async function(req, res,next){
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
  app.post("/register",async function(req,res){
  
    // bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
    //   // Store hash in your password DB.
    //   const newUser=new User({
    //     email:req.body.username,
    //     // password:req.body.password
    //     // password:md5(req.body.password)
    //     password:hash
    //   });
  
    //   await newUser.save()
    //   .then(function () {
    //     res.render("secrets");
    //   })
    //   .catch(function (err) {
    //     console.log(err);
    //   });
      
  // });
  
  User.register({username:req.body.username, active:false},req.body.password,async function(err,user){
    if(err)
    {
      res.redirect("/register");
    }
    else{
       passport.authenticate("local")( req,res, function(){
        res.redirect("/secrets");
  //       const authenticate = await User.authenticate();
  // authenticate('username', 'password', async function(err, result) {
  //   if(err)
  //   {
  //     result.redirect("/register");
  //   }
  //   else{
  //     result.redirect("/secrets");
  //   }
  //   });
  
  });
} 
  
  });

});
  

  app.post("/login",async function(req,res){

    // const username= req.body.username;
    // const password= req.body.password;
    // // const password= md5(req.body.password);

    // const foundUser=await User.findOne({email:username});
    // if(foundUser)
    // {
    //   // if(foundUser.password===password)
    //   // {
    //   //   res.render("secrets");
    //   // }

    //   bcrypt.compare(password, foundUser.password, function(err, result) {
    //     // result == true
    //     if(result===true)
    //     {
    //       res.render("secrets");
    //     }
    // });
    // }
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
  
    req.login(user, function(err){
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      }
    });

  });

}
//not working on proxy
app.listen(3000, function() {
    console.log("Server started on port 3000");
  });