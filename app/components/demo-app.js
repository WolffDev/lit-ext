
import { LitElement, html } from '@polymer/lit-element/'
import { connect } from 'pwa-helpers/connect-mixin.js'
import AppStyles from './app-styles'
import RawComponent from './raw-component'
import TodoApp from './todo-app'

window.customElements.define('to-do-app', TodoApp)
window.customElements.define('raw-component', RawComponent)

export default (store) => {
  return class DemoApp extends connect(store)(LitElement) {

    static get properties() {
      return {
        counter: { type: Number },
        selection: { type: String }
      }
    }

    render() {
      return html`
        <style>
          ${AppStyles}
        </style>
        <h1 class="app-title">Are you ready? <span>${this.counter}</span></h1>
        ${this.selection ? html`<p>${this.selection}</p>` : null}
        <!-- <raw-component></raw-component> -->
        <!-- <to-do-app></to-do-app> -->
      `
    }

    stateChanged(state) {
      if (this.counter !== state.global.counter) {
        this.counter = state.global.counter
      }
      if (this.selection !== state.global.activeSelection) {
        this.selection = state.global.activeSelection
      }
    }
  }
}