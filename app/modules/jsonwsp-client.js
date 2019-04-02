/*
SCRIPT DESCRIPTION:
------------------
This is the jsonwsp client for javascript makes it possible to
access your jsonwsp webservice from a web browser using
asynchronious requests. It is ideal for creating rich web 2.0
applications.

IMPORTANT FOR INTERNET EXPLORER BROWSERS:
----------------------------------------
For Internet Explorer to work with this script make sure to load
the json2.js script in web pages before this script is loaded.
*/

// Hook on this function to get info about errors while they happen
function errorinfo (str) {}

// replace this with an array
function indexOf (lst, obj) {
  for (let i = 0; i < lst.length; i++) {
    if (lst[i] === obj) {
      return i
    }
  }
  return -1
}

// sortObjectKeys
function keys (obj) {
  let key_list = []
  for (let k in obj) {
    key_list.push(parseInt(k))
  }
  key_list.sort((a, b) => a - b)
  return key_list
}

let glob_id = 1;

export default class JSONWSPClient {

  constructor(enable = true) {
    // obj_id is never used, but do not remove
    this.obj_id = glob_id++
    this.via_proxy = enable
  }

  postRequest (data, response_callback, error_callback) {
    const fetchOptions = {
      mode: 'cors',
      method: 'POST',
      headers: {
        'Ladon-Proxy-Path': this.url,
        'Content-Type': 'application/json; charset=utf-8'
      },
      // body: JSON.stringify(data)
      body: data
    }
    return fetch(this.url, fetchOptions)
      .then(response => response.json())
      .then(jsonResponse => {
        response_callback(jsonResponse.result, jsonResponse.reflection, jsonResponse)
      })
      .catch(error_callback)
  }

  sendRequest (url) {
    const fetchOptions = {
      headers: {
        'Ladon-Proxy-Path': url,
        'Content-Type': 'application/json; charset=utf-8'
      }
    }
    return fetch(url, fetchOptions)
      .then(response => {
        // if (process.env.NODE_ENV !== 'production') {
        //   console.log(response)
        // }
        return response.json()
      })
  }

  methodInfo (method_name) {
    const params_order_name = {}
    for (let pkey in this.jsonrpc_desc.methods[method_name].params) {
      params_order_name[this.jsonrpc_desc.methods[method_name].params[pkey]['def_order']] = pkey
    }
    const porder_keys = keys(params_order_name)
    const ordered_params = []
    const ordered_mandatory_params = []
    const ordered_optional_params = []
    for (let idx = 0; idx < porder_keys.length; idx++) {
      let param_name = params_order_name[porder_keys[idx]]
      ordered_params.push(param_name)
      if (this.jsonrpc_desc.methods[method_name].params[param_name]['optional'] == true) {
        ordered_optional_params.push(param_name)
      } else {
        ordered_mandatory_params.push(param_name)
      }
    }

    return {
      method_name: method_name,
      params_order: ordered_params,
      mandatory_params: ordered_mandatory_params,
      optional_params: ordered_optional_params,
      params_info: this.jsonrpc_desc.methods[method_name].params,
      doc_lines: this.jsonrpc_desc.methods[method_name].doc_lines,
      ret_info: this.jsonrpc_desc.methods[method_name].ret_info
    }
  }

  paramInfo (method_name, param_name) {
    return this.methodInfo(method_name).params_info[param_name]
  }

  documentation (method_name, param_name) {
    if (method_name == null) {
      docstr = ''
    } else if (method_name && param_name == null) {
      docstr = this.methodInfo(method_name).doc_lines.join('\n')
    } else {
      docstr = this.methodInfo(method_name).params_info[param_name].doc_lines.join('\n')
    }
    if (!docstr) {
      docstr = ''
    }
    return docstr
  }

  callMethod (method_name, args, mirror, cb, er_cb) {
    const minfo = this.methodInfo(method_name)
    const mparams = minfo.mandatory_params

    for (let pname in args) {
      const mpidx = indexOf(mparams, pname)
      if (mpidx > -1) {
        mparams.splice(mpidx, 1)
      }
      continue
    }
    if (mparams.length > 0) {
      errorinfo('Error: Missing mandatory parameters')
      return
    }

    let jsonwsp_req = {
      type: 'jsonwsp/request',
      version: '1.0',
      methodname: method_name,
      args: args
    }
    if (mirror != null) {
      jsonwsp_req.mirror = mirror
    }
    this.postRequest(JSON.stringify(jsonwsp_req), cb, er_cb)
  }

  loadDescription (url) {
    return this.sendRequest(url)
      .then(jsonrpc_desc => {
        this.jsonrpc_desc = jsonrpc_desc
        this.url = jsonrpc_desc.url
        this.servicename = jsonrpc_desc.servicename
        // Convert service methods to javascript proxy versions
        for (let method in jsonrpc_desc.methods) {
          (m => {
            this[m] = function(args, mirror, callback, error_callback) {
              this.callMethod(m, args, mirror, callback, error_callback)
            }
            // this[m] = this.callMethod.bind(m)
          })(method)
        }
        return this
      })
  }
}