$(document).ready(function (e) {

    loadPage(); // display any stored, existing tasks

    // adds button
    $('#add-todo').button({
        icons: { primary: "ui-icon-circle-plus" }
    }).click(function () { // when this button is clicked
        $('#new-todo').dialog('open'); // open the dialog box
    });

    // adds dialog box
    $('#new-todo').dialog({
        modal: true, autoOpen: false, buttons: {
            "Add task": function () {
                let taskName = $('#task').val(); // retrieve the task entered by the user
                if (taskName === '') {
                    return false; // exit the function if taskName is an empty string
                }

                let id = "";
                let ERROR_LOG = console.error.bind(console);
                // send POST request to the server
                $.ajax({
                    method: 'POST',
                    url: 'http://localhost:8080/api/tasks',
                    data: JSON.stringify({
                        name: taskName
                    }),
                    contentType: "application/json",
                    dataType: "json",
                    statusCode: {
                        422: () => {
                            alert("Quote marks not allowed.");
                        }
                    },
                    success: (response) => id = parseInt(response.id)
                }).then(() => {
                    // create the HTML elements to represent the task
                    let taskHTML = '<li id=' + id + '><span class="done">%</span>';
                    taskHTML += '<span class="delete">x</span>';
                    taskHTML += '<span class="task"></span>' + '</li>';
                    let $newTask = $(taskHTML);
                    $newTask.find('.task').text(taskName);
                    $newTask.hide();
                    $('#todo-list').prepend($newTask);
                    // display the task
                    $newTask.show('clip', 250).effect('highlight', 1000);
                    $('#task').val('') // clear the text input field
                    $(this).dialog('close');
                }, ERROR_LOG);
            },

            "Cancel": function () {
                $(this).dialog('close');
                $('#task').val('') // clear the text input field
            }
        }
    });

    // for marking tasks as complete
    $('#todo-list').on('click', '.done', function () {
        let $taskItem = $(this).parent('li');
        let taskId = $taskItem.attr('id');
        let ERROR_LOG = console.error.bind(console);
        // send PUT request to the server (update task from incomplete to complete)
        $.ajax({
            method: 'PUT',
            url: `http://localhost:8080/api/tasks/${taskId}`,
            data: JSON.stringify({
                completed: true
            }),
            contentType: "application/json",
            dataType: "json"
        }).then(() => {
            $taskItem.slideUp(250, function () {
                let $this = $(this);
                $this.detach();
                // move task to the completed list
                $('#completed-list').prepend($this);
                $this.slideDown();
            });
        }, ERROR_LOG);
    });

    // for marking tasks as complete/incomplete by clicking and dragging
    $('.sortlist').sortable({
        connectWith: '.sortlist',
        cursor: 'pointer',
        placeholder: 'ui-state-highlight',
        cancel: '.delete,.done',
        // The receive is triggered when an item from a connected sortable list has been dropped into 
        // another list. ui is the event target.
        receive: (event, ui) => {
            let taskId = ui.item.attr("id");
            let list = $(ui.item).closest("ul").attr("id");
            // send PUT request to the server (update task from incomplete to complete or vice versa)
            $.ajax({
                method: 'PUT',
                url: `http://localhost:8080/api/tasks/${taskId}`,
                data: JSON.stringify({
                    completed: list === "completed-list" ? true : false
                }),
                contentType: "application/json",
                dataType: "json"
            });
        }
    });

    // keeps track of what task the user wants to delete
    let clickedOn;

    // for deleting tasks
    $('.sortlist').on('click', '.delete', function () {
        clickedOn = $(this).parent('li')
        $('#confirm').dialog('open');
    });

    // asks the user to confirm if they want to delete the task
    $('#confirm').dialog({
        modal: true, autoOpen: false, buttons: {
            "Confirm": function () {
                let taskId = clickedOn.attr("id");
                let ERROR_LOG = console.error.bind(console);
                // send DELETE request to the server
                $.ajax({
                    method: 'DELETE',
                    url: `http://localhost:8080/api/tasks/${taskId}`
                }).then(() => {
                    clickedOn.effect('puff', function () {
                        clickedOn.remove();
                    });
                    $(this).dialog('close');
                }, ERROR_LOG);
            },

            "Cancel": function () {
                $(this).dialog('close');
            }
        }
    });

    /**
     * Retrieves every task in the database and displays them.
     */
    function loadPage() {
        let ERROR_LOG = console.error.bind(console);
        let tasks = [];
        $.ajax({
            url: "http://localhost:8080/api/tasks",
            method: 'GET',
            success: (response) => {
                tasks = response;
            }
        }).then(() => {
            tasks.forEach((task) => {
                let taskHTML = '<li id=' + task.id + '><span class="done">%</span>';
                taskHTML += '<span class="delete">x</span>';
                taskHTML += '<span class="task"></span>' + '</li>';
                let $newTask = $(taskHTML);
                $newTask.find('.task').text(task.name);
                $newTask.hide();
                if (task.completed) {
                    $('#completed-list').prepend($newTask);
                } else {
                    $('#todo-list').prepend($newTask);
                }
                $newTask.show('clip', 250).effect('highlight', 1000);
            })
        }, ERROR_LOG);
    }

}); // end ready