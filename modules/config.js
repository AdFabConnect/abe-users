var config = {
  secret: 'GoNinjaGo',
  login: '/abe/plugin/abe-users/login',
  signup: '/abe/plugin/abe-users/signup',
  logout: '/abe/plugin/abe-users/logout',
  home: '/abe/',
  smtp: null,
  forgotExpire: 60,
  email: {
    from: "ABE Support <no-reply@abejs.io>",
    subject: "Reset your password",
    text: "Reset your password {{forgotUrl}}",
    html: "<b>Reset your password</b> <a href='{{forgotUrl}}'>{{forgotUrl}}</a>"
  },
  "mustCommonPassword": ["password", "123456", "12345678", "1234", "qwerty", "12345", "dragon", "pussy", "baseball", "football", "letmein", "monkey", "696969", "abc123", "mustang", "michael", "shadow", "master", "jennifer", "111111", "2000", "jordan", "superman", "harley", "1234567", "fuckme", "hunter", "fuckyou", "trustno1", "ranger", "buster", "thomas", "tigger", "robert", "soccer", "fuck", "batman", "test", "pass", "killer", "hockey", "george", "charlie", "andrew", "michelle", "love", "sunshine", "jessica", "asshole", "6969", "pepper", "daniel", "access", "123456789", "654321", "joshua", "maggie", "starwars", "silver", "william", "dallas", "yankees", "123123", "ashley", "666666", "hello", "amanda", "orange", "biteme", "freedom", "computer", "sexy", "thunder", "nicole", "ginger", "heather", "hammer", "summer", "corvette", "taylor", "fucker", "austin", "1111", "merlin", "matthew", "121212", "golfer", "cheese", "princess", "martin", "chelsea", "patrick", "richard", "diamond", "yellow", "bigdog", "secret", "asdfgh", "sparky", "cowboy"],
  "owasp": {
    "allowPassphrases": true,
    "maxLength": 128,
    "minLength": 10,
    "minPhraseLength": 20,
    "minOptionalTestsToPass": 4,
    "sameAsUser": true,
    "mostCommon": true
  },
  "limiter": {
    "duration": 6000,
    "max": 100
  },
  "manage": ["admin"],
  "roles": [
    {
      "workflow":"review",
      "name":"Contributor"
    },
    {
      "workflow":"admin",
      "name":"Admin"
    }
  ],
  "workflow": ["draft", "review", "publish"],
  "routes": {
    "admin": [
      ".*?"
    ],
    "review": [
      ".*?"
    ]
  },
  getConfig(str, abe) {
  	if(typeof abe.config.plugins.users !== 'undefined' && abe.config.plugins.users !== null) {
  		if(typeof abe.config.plugins.users[str] !== 'undefined' && abe.config.plugins.users[str] !== null) {
  				return abe.config.plugins.users[str]
  			}	
  	}

  	return config[str]
  }
};

module.exports = config