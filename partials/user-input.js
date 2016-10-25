var userInput = {
  isInit: false,
  init: function () {
    this.isInit = true
    // const
    this._btnHidden = document.querySelector('.form-wrapper .btns [data-action="draft"]');
    this._btnActions = [].slice.call(document.querySelectorAll('.form-wrapper .btns [data-workflow]'));
    this._btnReject = document.querySelector('.form-wrapper .btns [data-extra-btn="reject"]');
    this._btnEdit = document.querySelector('.form-wrapper .btns [data-extra-btn="edit"]');

    this._inputs = [].slice.call(document.querySelectorAll('input.form-abe'));
    this._inputs = this._inputs.concat([].slice.call(document.querySelectorAll('textarea.form-abe')));
    this._inputsFile = [].slice.call(document.querySelectorAll('.upload-wrapper input[type="file"]'))
    this._selects = [].slice.call(document.querySelectorAll('#abeForm select'))
    this._inputHasChanged = false;
    this._checkInputChanged = (typeof this._btnHidden !== 'undefined' && this._btnHidden !== null) ? true : false

    // bind this
    this._handleInputChange = this._inputChange.bind(this);
    this._handleOnSaved = this._onSaved.bind(this);
    // this._handleWillSave = this._willSaved.bind(this);

    this._bindEvent();
    this._showHideBtn();
  },
  _csrfToken() {
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
  _showHideBtn() {
    this._changeCurrentBtn(document.querySelector('.form-wrapper .btns [data-action="' + json.abe_meta.status + '"]'));

    var isCurrent = false
    Array.prototype.forEach.call(this._btnActions, function(btn) {
      
      if (btn.classList.contains('current')) {
        btn.classList.add('btn-hidden')
        // btn.classList.remove('btn-hidden')
        isCurrent = true
      }else {
        if (isCurrent) {
          btn.classList.remove('btn-hidden')
          isCurrent = false
        }else {
          btn.classList.add('btn-hidden')
        }
      }
    }.bind(this))

    if (json.abe_meta.status !== "draft" && json.abe_meta.status !== "publish") {
      this._btnReject.classList.remove('btn-hidden')
    }else {
      this._btnReject.classList.add('btn-hidden')
    }
    if (json.abe_meta.status === "publish") {
      this._btnEdit.classList.remove('btn-hidden')
    }else {
      this._btnEdit.classList.add('btn-hidden')
    }
    if (json.abe_meta.status === "draft") {
      this._enableInput()
      this._btnActions[0].classList.remove('btn-hidden')
      this._btnActions[1].classList.remove('btn-hidden')
    }else {
      this._disableInput()
    }
  },
  _changeCurrentBtn(currentBtn) {
    var isCurrent = false
    Array.prototype.forEach.call(this._btnActions, function(btn) {
      btn.classList.remove('current')
    }.bind(this))
    currentBtn.classList.add('current')
  },
  _disableInput() {
    Array.prototype.forEach.call(this._inputsFile, function(input) {
      input.setAttribute('disabled', '')
    }.bind(this));
    Array.prototype.forEach.call(this._inputs, function(input) {
      input.setAttribute('disabled', '')
    }.bind(this));
    Array.prototype.forEach.call(this._selects, function(input) {
      input.setAttribute('disabled', '')
    }.bind(this));
  },
  _enableInput() {
    Array.prototype.forEach.call(this._inputsFile, function(input) {
      input.removeAttribute('disabled')
    }.bind(this));
    Array.prototype.forEach.call(this._inputs, function(input) {
      input.removeAttribute('disabled')
    }.bind(this));
    Array.prototype.forEach.call(this._selects, function(input) {
      input.removeAttribute('disabled')
    }.bind(this));
  },
  _bindEvent: function (e) {
    window.abe.save.onFileSaved(this._handleOnSaved)

    Array.prototype.forEach.call(this._btnActions, function(btn) {
      btn.addEventListener('click', this._handleWillSave)
    }.bind(this));

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
  },
  _onSaved: function (e) {
    this._showHideBtn();
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

document.addEventListener('abeReady', function() {
  if (!userInput.isInit) {
    userInput.init();
  }
})

document.addEventListener('DOMContentLoaded', function() {
  if (window.abe != null && !userInput.isInit) {
    userInput.init();
  }
})

userInput._csrfToken();