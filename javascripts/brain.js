/**
 * Created by ronnen on 7/10/19.
 */

var state = {
  controlPane: 'new',
  currentViewer: null,

  people: [],
  involved: [],
  fields: [],
  requester: null,
  subject: "",
  fieldValues: [],
  approvalOrder: [],
  history: [],
};

function Brain() {
  function renderControlPane() {
    switch (state.controlPane) {
      case 'new':
        $(".control-pane").attr('data-state','new');
        break;
      case 'process':
        $(".control-pane").attr('data-state','process');
        var onTheHook = whoIsOnTheHookNext();
        populateControlPane(onTheHook);
        break;
      default:;
    }
  }

  function addPersonToPeople(name, role) {
    var person = findPerson(state.people, name);

    if (!person) {
      state.people.push({
        name: name,
        role: role,
      });
    }
  }

  function populateSelectWithPeople($select, people) {
    $select.empty();
    people.forEach(function(p) {
      $select.append(`<option value="${p.name}">${p.name}, ${p.role}</option>`);
    })
  }

  function addPersonToInvolved(name, role) {
    var person = findPerson(state.involved, name);

    if (!person) {
      state.involved.push({
        name: name,
        role: role,
      });
      person = state.involved.slice(-1)[0];
    }
    return person;
  }

  function findPerson(arr, name) {
    return arr.find(function(p) {
      return p.name == name;
    });
  }

  function findField(arr, name) {
    return arr.find(function(p) {
      return p.name == name;
    });
  }

  function populateInvolvedSection() {
    $(".request-pane .involved .person-marker").remove();
    state.involved.forEach(function(p) {
      var $person = $(".person-marker-template").clone();
      $person.find(".name").text(p.name);
      $person.find(".role").text(p.role);
      $(".request-pane .involved").append($person.html());
    })
  }

  function populateApprovalOrder() {
    if (!state.approvalOrder.length) return;

    $(".request-pane .approval-order-content").empty();
    state.approvalOrder.forEach(function(o) {
      var $order = $(".approval-order-template").clone();
      $order.find(".person-marker.before .name").text(o.before.name);
      $order.find(".person-marker.before .role").text(o.before.role);
      $order.find(".person-marker.after .name").text(o.after.name);
      $order.find(".person-marker.after .role").text(o.after.role);
      $(".request-pane .approval-order-content").append($order.html());
    })
  }

  function addFieldToFields(name, type, owner = null) {
    state.fields.push({
      name: name,
      type: type,
      owner: owner,
    });
  }

  function populateFieldsSection() {
    $(".request-pane .fields .field.custom").remove();
    state.fields.forEach(function(f) {
      var $field = $(".field-template").clone();
      $field.find(".label").text(f.name + ":");
      $field.find("input").attr("data-name", f.name);
      var field = findField(state.fieldValues, f.name);
      $(".request-pane .fields").append($field.html());
      $field = $(`.request-pane .fields .field input[data-name='${f.name}']`);
      if (field) $field.val(field.value);
      if (f.locked || (f.owner && f.owner.name != state.currentViewer.name)) $field.prop("readonly",true);
      if ((!f.owner || f.owner && f.owner.name == state.currentViewer.name) && $field.val() == "") {
        $field.addClass("required");
      }
    })
  }

  function collectFieldValues() {
    state.fieldValues = [];

    $(".request-pane .fields .field.custom").each(function() {
      var value = $(this).find("input.value").val();
      var name = $(this).find("input.value").attr("data-name");

      state.fieldValues.push({name, value});
    });
  }

  function lockEnteredFields() {
    state.fieldValues.forEach(function(f) {
      if (f.value !== "") {
        var field = findField(state.fields, f.name);
        field.locked = true;
      }
    });
  }

  function addApprovalOrder(before, after) {
    var found = state.approvalOrder.some(function(a) {
      return a.before.name == before.name && a.after.name == after.name;
    });
    if (!found) {
      state.approvalOrder.push({before, after});
    }
  }

  function addPersonHandler() {
    $("#helper-add-person").off().on("click",function() {
      $(".shield").addClass("on");
      $(".dialog.add-person").addClass("active");
      populateSelectWithPeople($(".dialog.add-person select.people"), state.people);

      $(".dialog.add-person #new-person").off().on("click",function() {
        $(".dialog.new-person .value").val("");
        $(".shield2").addClass("on");
        $(".dialog.new-person").addClass("active");

        $(".dialog.new-person .ok").off().on("click",function() {
          // TODO add check that these are not empty
          var name = $("#new-person-name").val();
          addPersonToPeople(name,$("#new-person-role").val());
          $(".shield2").removeClass("on");
          $(".dialog.new-person").removeClass("active");
          populateSelectWithPeople($(".dialog.add-person select.people"), state.people);
          $(".dialog.add-person select.people").val(name);
        });
        $(".dialog.new-person .cancel").off().on("click",function() {
          console.log("cancel2");
          $(".shield2").removeClass("on");
          $(".dialog.new-person").removeClass("active");
        });
      });

      $(".dialog.add-person .cancel").off().on("click",function() {
        console.log("cancel");
        $(".shield").removeClass("on");
        $(".dialog.add-person").removeClass("active");
      });

      $(".dialog.add-person .ok").off().on("click",function() {
        var name = $(".dialog.add-person select").children("option:selected").val();
        var person = findPerson(state.people, name);
        addPersonToInvolved(person.name,person.role);

        $(".shield").removeClass("on");
        $(".dialog.add-person").removeClass("active");

        populateInvolvedSection();
      });
    });
  }

  function addFieldHandler() {
    $("#helper-add-field").off().on("click",function() {
      if (!collectBasicFields()) return;
      collectFieldValues();

      $(".shield").addClass("on");
      $(".dialog.add-field").addClass("active");

      $(".dialog.add-field #new-field-name").val("");

      if (state.currentViewer) {
        populateSelectWithPeople($(".dialog.add-field #new-field-owner"), state.involved);
        // find currentViewer and make him/her default owner of new field
        $(`.dialog.add-field #new-field-owner option[value="${state.currentViewer.name}"]`).prop("selected", true);
      }

      $(".dialog.add-field .cancel").off().on("click",function() {
        $(".shield").removeClass("on");
        $(".dialog.add-field").removeClass("active");
      });

      $(".dialog.add-field .ok").off().on("click",function() {
        var owner = $(".dialog.add-field #new-field-owner").children("option:selected").val();
        var type = $(".dialog.add-field select.types").children("option:selected").val();
        var name = $("#new-field-name").val();
        addFieldToFields(name,type,owner ? findPerson(state.involved, owner) : null);

        $(".shield").removeClass("on");
        $(".dialog.add-field").removeClass("active");

        populateFieldsSection();
      });
    });
  }

  function missingDataHandler() {
    $("#helper-missing-data").off().on("click",function() {
      $(".shield").addClass("on");
      $(".dialog.missing-data").addClass("active");

      $(".dialog.missing-data #missing-data-field-name").val("");

      populateSelectWithPeople($(".dialog.missing-data #missing-data-owner"), state.involved);

      $(".dialog.missing-data .cancel").off().on("click",function() {
        $(".shield").removeClass("on");
        $(".dialog.missing-data").removeClass("active");
      });

      $(".dialog.missing-data .ok").off().on("click",function() {
        var owner = $(".dialog.missing-data #missing-data-owner").children("option:selected").val();
        var type = $(".dialog.missing-data #missing-data-field-type").children("option:selected").val();
        var name = $(".dialog.missing-data #missing-data-field-name").val();
        addFieldToFields(name,type,findPerson(state.involved, owner));

        $(".shield").removeClass("on");
        $(".dialog.missing-data").removeClass("active");

        populateFieldsSection();
      });
    });
  }

  function approversBeforeMeHandler() {
    $("#helper-approvers-before").off().on("click",function() {
      $(".shield").addClass("on");
      $(".dialog.approver-before").addClass("active");

      populateSelectWithPeople($(".dialog.approver-before #approver-before"),
        state.involved.filter(function(p) {
          return p.name != state.currentViewer.name && p.name != state.requester.name;
        }));

      $(".dialog.approver-before .cancel").off().on("click",function() {
        $(".shield").removeClass("on");
        $(".dialog.approver-before").removeClass("active");
      });

      $(".dialog.approver-before .ok").off().on("click",function() {
        var name = $(".dialog.approver-before #approver-before").children("option:selected").val();
        var person = findPerson(state.involved, name);
        addApprovalOrder(person, state.currentViewer);

        $(".shield").removeClass("on");
        $(".dialog.approver-before").removeClass("active");

        populateApprovalOrder();
      });
    });
  }

  function approversAfterMeHandler() {
    $("#helper-approvers-after").off().on("click",function() {
      $(".shield").addClass("on");
      $(".dialog.approver-after").addClass("active");

      populateSelectWithPeople($(".dialog.approver-after #approver-after"),
        state.involved.filter(function(p) {
          return p.name != state.currentViewer.name && p.name != state.requester.name;
        }));

      $(".dialog.approver-after .cancel").off().on("click",function() {
        $(".shield").removeClass("on");
        $(".dialog.approver-after").removeClass("active");
      });

      $(".dialog.approver-after .ok").off().on("click",function() {
        var name = $(".dialog.approver-after #approver-after").children("option:selected").val();
        var person = findPerson(state.involved, name);
        addApprovalOrder(state.currentViewer, person);

        $(".shield").removeClass("on");
        $(".dialog.approver-after").removeClass("active");

        populateApprovalOrder();
      });
    });
  }

  function populateHistorySection() {
    var $content = $(".request-pane .history-section .history-container");
    $content.empty();

    state.history.forEach(function(p, index) {
      var $person = $(".person-marker-template").clone();
      $person.find(".name").text(p.name);
      $person.find(".role").text(p.role);
      $person.find(".person-marker").addClass(p.approved ? "approved" : "rejected");
      $content.append($person.html());

      if (index+1 < state.history.length)
        $content.append(`<div class="dashed-line"></div><div class="fa fa-caret-right"></div>`);
    });
  }

  function collectBasicFields() {
    // add person if not yet in people and in involved
    var name = $(".request-pane #requester-name").val();
    var role = $(".request-pane #requester-role").val();
    var subject = $(".request-pane #request-subject").val();

    if (name == "" || role == "" || subject == "") {
      alert("Please enter your name, role and subject");
      return false;
    }

    addPersonToPeople(name, role);
    var newPerson = addPersonToInvolved(name,role);

    state.requester = newPerson;
    state.subject = subject;
    if (state.controlPane == 'new') state.currentViewer = newPerson;
    return true;
  }

  function requestReadyHandler() {
    $(".request-pane .link.ready").off().on("click",function() {
      // TODO check if all data exists before submitting back

      if (!collectBasicFields()) return;

      state.fields.forEach(function(f) {
        if (!f.owner) f.owner = findPerson(state.involved, name);
      });

      collectFieldValues();
      lockEnteredFields();
      state.controlPane = 'process';

      $(".control-pane").trigger("brain-process"); //
    });
  }

  function requestDoneHandler() {
    $(".request-pane .link.ready").off().on("click",function() {

      collectFieldValues();
      lockEnteredFields();
      state.controlPane = 'process';

      $(".control-pane").trigger("brain-process"); //
    });
  }

  function requestApproveHandler() {
    $(".request-pane .action-button.approve").off().on("click",function() {
      var p = findPerson(state.involved, state.currentViewer.name);
      p.approved = true;
      state.history.push(p);

      // in case approver has entered data as well
      collectFieldValues();
      lockEnteredFields();
      state.controlPane = 'process';

      var details = {
        involved: state.currentViewer,
        action: "approve",
      };
      $(".control-pane").trigger("brain-process", details); //
    });
  }

  function requestRejectHandler() {
    $(".request-pane .action-button.reject").off().on("click",function() {
      var p = findPerson(state.involved, state.currentViewer.name);
      p.rejected = true;
      state.history.push(p);

      // in case approver has entered data as well
      collectFieldValues();
      lockEnteredFields();
      state.controlPane = 'process';

      var details = {
        involved: state.currentViewer,
        action: "reject",
      };
      $(".control-pane").trigger("brain-process", details); //
    });
  }

  $(".control-pane").on("brain-process", function(event, details) {
    state.lastActionDetails = details;
    renderControlPane();
    switch (state.controlPane) {
      case 'new':
        $("#new-request").off().on("click",function() {
          var $requestPane = $(".request-pane");
          $requestPane.empty();
          var $newRequest = $(".request-template").clone();
          // $(".request-pane").append($(".new-request-template").clone().html());
          $requestPane.append($newRequest.html()).addClass("requester");
          $("#requester-name", $requestPane).prop("readonly", false);
          $("#requester-role", $requestPane).prop("readonly", false);
          $("#request-subject", $requestPane).prop("readonly", false);
          $(".link.ready", $requestPane).text("I think I'm ready");

          state.people = [];
          state.involved = [];
          state.fields = [];

          addPersonHandler();
          addFieldHandler();
          requestReadyHandler();
        });
        break;
      case 'process':
        var $requestPane = $(".request-pane");
        $requestPane.empty();
        break;
    }
  });

  function whoIsOnTheHookNext() {
    // business logic to figure out who is supposed to take action next
    return state.involved.filter(function(p) {
      // if an approver should wait in order for others to approve then don't notify him/her
      if (state.approvalOrder && state.approvalOrder.length) {
        var before = state.approvalOrder.filter(function(o) {return o.after.name == p.name;});
        if (before.some(function(p) {
            var person = findPerson(state.involved, p.before.name);
            return !person.approved && !person.rejected;
          })) return false;
      }

      // if someone approved/rejected then notify all except this approver
      if (state.lastActionDetails &&
        ["reject","approve"].indexOf(state.lastActionDetails.action) >= 0 &&
          state.lastActionDetails.involved.name != p.name)
        return true;

      // if someone owns a field that lacks value then notify him/her
      if (state.fields.some(function(f) {
        var field = findField(state.fieldValues, f.name);
        return (f.owner && f.owner.name == p.name && field.value == "");
      })) return true;

      // if someone other than requester did not approve/reject yet then notify them
      if (p.name != state.requester.name && !p.approved && !p.rejected) return true;

      return false;
    });
  }

  function populateControlPane(people) {
    var $people = $(".control-pane .content[data-state='process'] .people");
    $people.empty();
    people.forEach(function(p) {
      var $person = $(".person-button-template").clone();
      $person.find(".name").text(p.name);
      $person.find(".role").text(p.role);
      if (state.currentViewer && state.currentViewer.name == p.name) $person.addClass("active");
      $people.append($person.html());
    });

    $(".person-button", $people).each(function() {
      $(this).on("click", function() {
        // alert($(this).find(".name").text());
        $(".person-button", $people).removeClass("active");
        $(this).addClass("active");
        var name = $(this).find(".name").text();
        state.currentViewer = findPerson(state.involved, name);
        var requesterView = state.currentViewer.name == state.requester.name;

        var $requestPane = $(".request-pane");
        $requestPane.empty();
        $requestPane.toggleClass("requester", requesterView);

        $requestPane.append($(".request-template").clone().html());

        if (requesterView) $(".link.ready", $requestPane).text("I think I'm ready");

        populateInvolvedSection();
        populateApprovalOrder();

        $("#requester-name", $requestPane).val(state.requester.name);
        $("#requester-role", $requestPane).val(state.requester.role);
        $("#request-subject", $requestPane).val(state.subject);
        populateFieldsSection();
        populateHistorySection();

        addPersonHandler();
        addFieldHandler();
        missingDataHandler();
        approversBeforeMeHandler();
        approversAfterMeHandler();
        requestDoneHandler();

        var madeDecision = findPerson(state.history, state.currentViewer.name);
        if (madeDecision) {
          $(".actions .action-button", $requestPane).addClass("disabled");
        }
        else {
          requestApproveHandler();
          requestRejectHandler();
        }
      });
    })
  }

  $(".control-pane").trigger("brain-process", state.lastActionDetails); // this starts the loop

}
