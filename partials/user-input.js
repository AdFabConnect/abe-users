var userInput = {
  init: function () {
    // const
    this._btnHidden = document.querySelector('.form-wrapper .btns [data-action="draft"]');
    console.log(this._btnHidden)
    this._inputs = [].slice.call(document.querySelectorAll('input.form-abe'));
    this._inputs = this._inputs.concat([].slice.call(document.querySelectorAll('textarea.form-abe')));
    this._inputsFile = [].slice.call(document.querySelectorAll('.upload-wrapper input[type="file"]'))
    this._selects = [].slice.call(document.querySelectorAll('#abeForm select'))
    this._inputHasChanged = false;
    this._checkInputChanged = (typeof this._btnHidden !== 'undefined' && this._btnHidden !== null) ? true : false

    // bind this
    this._handleInputChange = this._inputChange.bind(this);

    this._bindEvent();
  },
  _bindEvent: function (e) {
    Array.prototype.forEach.call(this._inputsFile, function(input) {
      if(!this._checkInputChanged){
        input.setAttribute('disabled', '')
      }
    }.bind(this));
    Array.prototype.forEach.call(this._inputs, function(input) {
      if(!this._checkInputChanged){
        input.setAttribute('disabled', '')
      }
      input.addEventListener('keyup', this._handleInputChange)
    }.bind(this));
    Array.prototype.forEach.call(this._selects, function(input) {
      if(!this._checkInputChanged){
        input.setAttribute('disabled', '')
      }
      input.addEventListener('change', this._handleInputChange)
    }.bind(this));

    var csrfToken = document.querySelector('#globalCsrfToken').value;
    var forms = [].slice.call(document.querySelectorAll('form'));
    Array.prototype.forEach.call(forms, function(form) {
      var csrInput = document.createElement('input');
      csrInput.type = 'hidden';
      csrInput.name = '_csrf';
      csrInput.value = csrfToken;
      form.appendChild(csrInput);
    });

    (function(send) {
      XMLHttpRequest.prototype.send = function(data) {
        this.setRequestHeader('X-CSRF-Token', csrfToken);
        send.call(this, data);
      };
    })(XMLHttpRequest.prototype.send);
  },
  _inputChange: function (e) {
    if(!this._checkInputChanged || this._inputHasChanged) return
    this._inputHasChanged = true
    Array.prototype.forEach.call(document.querySelectorAll('.btn-save'), function(btn) {
      if(!btn.classList.contains('btn-hidden')) btn.classList.add('btn-hidden')
    }.bind(this))
    this._btnHidden.classList.remove('btn-hidden')
  }
}

userInput.init();