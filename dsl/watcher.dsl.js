const input = (...args) => {};

// this generates a chain of inputs
// it infers input types
input({
  watchUrl: "https://www.google.com",
  timeWindow: 1000,
  logs: query('./reconext-query.js'),
  // queries are kibana-like since they are a lot easier to reason about
  // you can still provide a whole object query
  kibanaQuery: query({
    indexes: ['eks-*'],
    timeRange: '-2h to now',
    query: 'Error while processing request',
    filters: {
      'kubernetes.container_name': isOneOf('ips-hermes'),
    }
  }),
  inlineQuery: rawQuery({ /* a raw Elastic query here */ })
});

// this is the 'compare' condition
condition({
  'kibanaQuery.hits.total': gt(0),
});

// transform is like input() but accepting script and search (aka queries)
transform(script('./general-script.groovy'));

webhookAction({
  // script id will be: {project_id}{parent_folder}{alert_folder}{script_filename}
  // so if the same script is used in different places, it will have the same id
  transform: script('./transform1.groovy'),
  configs: {
    method: 'POST',
    host: 'hooks.slack.com',
    port: 443,
    path: '/somepath',
    body: {
      text: 'Some text',
      attachments: [
        {
          title: 'Some title',
          text: 'Some text',
          color: 'good'
        }
      ]
    }
  }
});

// Execution
// 1. collect scripts transpile and compute their ids with the following pattern:
//    {project_id}{parent_folder}{alert_folder}{script_filename}
