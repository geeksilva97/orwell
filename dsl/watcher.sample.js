const { webhook } = require('./base')
  ;
const transformScript = script('../test/fixtures/my-js-alert/transform.groovy')

module.exports = {
  "trigger": {
    "schedule": {
      "interval": "2h"
    }
  },
  "input": {
    "chain": {
      "inputs": [
        {
          "static": {
            "simple": {
              "watchUrl": "https://gopaydev-non-prod-usw2.kb.us-west-2.aws.found.io:9243/app/management/insightsAndAlerting/watcher/watches/watch/reconext-shipment-failure/status",
              "logsTemplateUrl": "https://gopaydev-non-prod-usw2.kb.us-west-2.aws.found.io:9243/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'{{from}}',to:'{{to}}'))&_a=(columns:!(message,serviceType,kubernetes.pod_name,'1'),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b59c2340-4aef-11eb-8672-b577a7e8cf5d,key:kubernetes.pod_name,negate:!f,params:!(ips-hermes),type:phrases),query:(bool:(minimum_should_match:1,should:!((match_phrase:(kubernetes.pod_name:ips-hermes))))))),grid:(columns:(message:(width:1432))),index:'02e4e940-68f4-11ef-bd08-7f5ff2bb8ce4',interval:auto,query:(language:kuery,query:'%22Failed%20to%20create%20reconext%20order%20-%20error%3D%22'),sort:!(!('@timestamp',desc)))",
              "timeWindowInMinutes": 120,
              "env": "NON-PROD"
            }
          }
        },
        {
          "logs": {
            "search": {
              "request": {
                "search_type": "query_then_fetch",
                "indices": [
                  "eks-*"
                ],
                "rest_total_hits_as_int": true,
                "body": {
                  "query": {
                    "bool": {
                      "filter": [
                        {
                          "range": {
                            "@timestamp": {
                              "gte": "{{ctx.trigger.scheduled_time}}||-2h",
                              "lte": "{{ctx.trigger.scheduled_time}}",
                              "format": "strict_date_optional_time||epoch_millis"
                            }
                          }
                        },
                        {
                          "match_phrase": {
                            "message": {
                              "query": "Failed to create reconext order - error=*;",
                              "slop": 10
                            }
                          }
                        },
                        {
                          "bool": {
                            "should": [
                              {
                                "match_phrase": {
                                  "kubernetes.pod_name": "ips-hermes"
                                }
                              }
                            ],
                            "minimum_should_match": 1
                          }
                        }
                      ]
                    }
                  },
                  "sort": {
                    "@timestamp": {
                      "order": "desc"
                    }
                  }
                }
              }
            }
          }
        }
      ]
    }
  },
  "condition": {
    "script": script('../test/fixtures/my-js-alert/condition.groovy')
  },
  "actions": {
    "send_slack_message": {
      "transform": {
        script: transformScript
      },
      webhook
    }
  },
  "transform": {
    "chain": [
      {
        "script": transformScript
      }
    ]
  }
};
