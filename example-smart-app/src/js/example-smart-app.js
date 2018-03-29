(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      }
                    }
                  });

        var condition = smart.patient.api.fetchAll({
            type: 'Condition'
        });

        $.when(pt, obv).fail(onError);
        $.when(pt, condition).fail(onError);

        $.when(pt, condition).done(function(patient, conditions) {
          var gender = patient.gender;

          var dob = new Date(patient.birthDate);
          var dobStr = formatDate(patient.birthDate);
          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          // var height = byCodes('8302-2');
          // var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          // var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          // var hdl = byCodes('2085-9');
          // var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = dobStr;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.age = parseInt(calculateAge(dob));
          // p.height = getQuantityValueAndUnit(height[0]);

          // if (typeof systolicbp != 'undefined')  {
          //   p.systolicbp = systolicbp;
          // }
          //
          // if (typeof diastolicbp != 'undefined') {
          //   p.diastolicbp = diastolicbp;
          // }

          // p.hdl = getQuantityValueAndUnit(hdl[0]);
          // p.ldl = getQuantityValueAndUnit(ldl[0]);

            console.log(conditions);
            p.conditions = conditions;

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function formatDate(dateString) {
    var date = new Date(dateString);
	  var day = date.getDate();
	  var monthIndex = date.getMonth() + 1;
	  var year = date.getFullYear();

	  return monthIndex + '/' + day + '/' + year;
  }

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      age: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function isLeapYear(year) {
    return new Date(year, 1, 29).getMonth() === 1;
  }

  function calculateAge(date) {
    if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())) {
      var d = new Date(date), now = new Date();
      var years = now.getFullYear() - d.getFullYear();
      d.setFullYear(d.getFullYear() + years);
      if (d > now) {
        years--;
        d.setFullYear(d.getFullYear() - 1);
      }
      var days = (now.getTime() - d.getTime()) / (3600 * 24 * 1000);
      return years + days / (isLeapYear(now.getFullYear()) ? 366 : 365);
    }
    else {
      return undefined;
    }
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#age').html(p.age);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);

    sortByDateDesc(p.conditions);
    renderConditions(p.conditions)
  };

  function sortByDateDesc(array) {
    array.sort(function(a, b) {
		  return new Date(a) - new Date(b);
	  });
  }

  function renderConditions(conditions) {
    var html = $('#conditions');
    conditions.forEach(function(condition) {
	    html.append(renderCondition(condition));
    });
    return html;
  }

  function renderCondition(condition) {
    return '<form class="card card-body">' +
        formRow(formLabel('Description') + formInput(condition.code.text)) +
        formRow(formLabel('Code') + formInput(condition.code.coding[0].code)) +
        formRow(formLabel('Date Recorded') + formInput(formatDate(condition.dateRecorded), 'email')) +
        '</form>';
  }

  function getCode(condition) {
    if (condition.code.coding === undefined) {
      return 'N/A';
    }
    return condition.code.coding[0].code;
  }

  function formRow(innerHtml) {
    return '<div class="form-group row">' + innerHtml + '</div>';
  }

  function formLabel(text) {
    return '<label class="col-sm-2 col-form-label font-weight-bold">' + text + '</label>';
  }

  function formInput(textValue, type) {
    return  '<div class="col-sm-10">' +
		  '<input type="' + getInputType(type)  +'" readonly class="form-control-plaintext" value="' + textValue + '">' +
		  '</div>';
  }

  function getInputType(type) {
    return type === undefined ? 'text' : type;
  }

})(window);
