'use strict';

/**
 * Serverless Project Class
 */

const SError         = require('./ServerlessError'),
    SUtils           = require('./utils/index'),
    SCli             = require('./utils/cli'),
    awsMisc          = require('./utils/aws/Misc'),
    ServerlessModule = require('./ServerlessModule'),
    extend           = require('util')._extend,
    path             = require('path'),
    fs               = require('fs'),
    BbPromise        = require('bluebird');

class ServerlessProject {

  /**
   * Constructor
   */

  constructor(Serverless, options) {
    this.S = Serverless;
    this.load(this.S._projectRootPath);
  }

  /**
   * Load
   * - Load from source (i.e., file system);
   */

  load(projectPath) {

    let _this = this;

    // Defaults
    _this._populated          = false;
    _this.data                = {};
    _this.data.name           = 'serverless' + SUtils.generateShortId(6);
    _this.data.version        = '0.0.1';
    _this.data.profile        = 'serverless-v' + require('../package.json').version;
    _this.data.location       = 'https://github.com/...';
    _this.data.author         = '';
    _this.data.description    = 'A Serverless Project';
    _this.data.custom         = {};
    _this.data.modules        = {};
    _this.data.plugins        = [];
    _this.data.cloudFormation = {
      "AWSTemplateFormatVersion": "2010-09-09",
      "Description": "The AWS CloudFormation template for this Serverless application's resources outside of Lambdas and Api Gateway",
      "Resources": {
        "IamRoleLambda": {
          "Type": "AWS::IAM::Role",
          "Properties": {
            "AssumeRolePolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Principal": {
                    "Service": [
                      "lambda.amazonaws.com"
                    ]
                  },
                  "Action": [
                    "sts:AssumeRole"
                  ]
                }
              ]
            },
            "Path": "/"
          }
        },
        "IamPolicyLambda": {
          "Type": "AWS::IAM::Policy",
          "Properties": {
            "PolicyName": "${stage}-${projectName}-lambda",
            "PolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Action": [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                  ],
                  "Resource": "arn:aws:logs:${region}:*:"
                }
              ]
            },
            "Roles": [
              {
                "Ref": "IamRoleLambda"
              }
            ],
            "Groups": [
              {
                "Ref": "IamGroupLambda"
              }
            ]
          }
        }
      },
      "Outputs": {
        "IamRoleArnLambda": {
          "Description": "ARN of the lambda IAM role",
          "Value": {
            "Fn::GetAtt": [
              "IamRoleLambda",
              "Arn"
            ]
          }
        }
      }
    };

    // If no project path exists, return
    if (!projectPath) return;

    // Get Project JSON
    let project = SUtils.readAndParseJsonSync(path.join(projectPath, 's-project.json'));

    // Add Modules & Functions
    project.modules = {};
    let moduleList  = fs.readdirSync(path.join(projectPath, 'back', 'modules'));

    for (let i = 0; i < moduleList.length; i++) {
      let module = new ServerlessModule(_this.S, { path: moduleList[i] });
      module = module.get();
      project.modules[module.name] = module;
    }

    _this = extend(_this.data, project);
  }

  /**
   * Get
   * - Return data
   */

  get() {
    return this.data;
  }

  /**
   * Set
   * - Update data
   */

  set(data) {

    // TODO: Validate data

    this.data = data;
  }

  /**
   * Populate
   * - Fill in templates then variables
   */

  populate(stage, region) {

    this._populated = true;

    // Am assuming this.data includes the already populated functions AND modules.
    // So now we're gonna loop through them all again?!
    // We should probably only pass in a project object without the functions and modules.
    // Eitherway, the populate util func. is ready to accept any obj, but it's a matter of efficiency.
    this.data = SUtils.populate(this.data, this.S._projectRootPath, stage, region);
  }
}

module.exports = ServerlessProject;