# Users

> plugin Abe for users and role management

```shell
abe add https://github.com/AdFabConnect/abe-users.git
```

### Requirement (optional)

> redis-server, if no redis server is running no **ratelimiter** on login will be done

Install an run redis if security ratelimiter needed on your website

```shell
brew install redis
```

```shell
redis-server
```

### Config

into your website abe.json file, add on the plugins/users json, roles, secret, manage, workflow and allowed routes for users roles

> abe.json

```json
{
...

  "pluginsConfig": {
    "users": {
    	// add following config here
    }
...
}
```

#### Add roles

The plugin add a new role (review) but you can add your own roles

```json
"roles": [
    {
      "workflow":"role1",
      "name":"first role with less power"
    },
    {
      "workflow":"role2",
      "name":"Role with more power than role1"
    },
    {
      "workflow":"admin",
      "name":"Master race"
    }
  ],
```

> role contains key/value workflow is the code key and name is the value that user will see

#### Define workflow

When users will save a content it's will need to pass all the workflow

```json
	"workflow": ["draft", "role1", "role2", "publish"],
```

> example : new article -> save to draft -> save to review -> save to approve -> finally publish content
> Users with not enough right will not be permitted to save content into those states
> 
> inside workflow config "draft" and "publish" are mandatory

#### Disallow routes

For some user you can disallow access to routes with the following config

```json
"routes": {
    "admin": [
      ".*?"
    ],
    "role1": [
      "^\/abe.*?",
      "^\/page.*?",
      "^\/reject.*?",
      "^\/draft.*?",
      "^\/role1.*?"
    ],
    "role2": [
      "^\/abe.*?",
      "^\/page.*?",
      "^\/reject.*?",
      "^\/draft.*?",
      "^\/role1.*?",
      "^\/role2.*?",
      "^\/publish.*?"
    ]
  }
```
> admin ```".?*"``` allow all route
> 
> example allow route /abe for user with role1 ```"^\/abe.*?"```

#### secure password

You can configure password security with this config

```json
"owasp": {
    "allowPassphrases": true,
    "maxLength": 128,
    "minLength": 8,
    "minPhraseLength": 20,
    "minOptionalTestsToPass": 4,
    "sameAsUser": true,
    "mostCommon": true
  },
```

Config default usin owasp see https://github.com/nowsecure/owasp-password-strength-test for more informations

> Extended with 2 function
> sameAsUser (check if username !== password and reverse)
> mostCommon (check if password isn't into the list of most common password used)

#### secure login

limiter config help you to restrict number of login submit

```json
  "limiter": {
    "duration": 6000,
    "max": 100
  },
```

### Login

Now that the plugin is installed you need to login, go to ```http://localhost:8000/```

It will redirect you to ```http://localhost:8000/plugin/abe-users/login```

Default login information are :

- login : **admin**
- password : **Adm1n@test**


### Create user

After login you're being redirected to ```http://localhost:8000/abe/```

Click on **User list** which redirect you to ```http://localhost:8000/plugin/abe-users/list```

Then create a new user with admin rights and delete the other admin/admin (for security purpose)

### forgot password (optional)

configure smtp for forgot password

```json
  "smtp": {
    "host": "smtp.gmail.com",
    "secureConnection": true,
    "port": 465,
    "auth": {
      "user": "gmail.user@gmail.com",
      "pass": "userpass"
    }
  },
  "email": {
    "from": "ABE Support <no-reply@abejs.io>",
    "subject": "Reset your password",
    "text": "Reset your password {{forgotUrl}}",
    "html": "<b>Reset your password</b> <a href='{{forgotUrl}}'>{{forgotUrl}}</a>"
  }
```

If you change text/html json value don't forget to insert {{forgotUrl}} to user forgot link

Other variables:

{{siteUrl}} for images assets
{{user.username}} username of the current user
{{user.name}} name of the current user