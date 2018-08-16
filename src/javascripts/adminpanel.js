var addedTotal = 0;
var addedData = [];

var subforum_rows
window.onload = function(){
	subforum_rows = document.getElementById("subforum_rows")
}

var editMode = null;

function addsubforum(){
	if(editMode !== null && editMode !== 1) return
	editMode = 1;
	var idCount = parseInt(document.getElementById("sfc").innerText)
	addedTotal++
	
	var tr = document.createElement("tr")
	tr.style.backgroundColor = "#cee7ff"
	
	var td1 = document.createElement("td")
	td1.innerText = idCount + addedTotal
	
	var td2 = document.createElement("td")
	td2.innerHTML = "<input style=\"width: 98%\">"
	
	var td3 = document.createElement("td")
	td3.innerHTML = "<input style=\"width: 98%\">"
	
	var td4 = document.createElement("td")
	
	var td5 = document.createElement("td")
	td5.innerText = "0"
	
	var td6 = document.createElement("td")
	td6.innerText = idCount + addedTotal
	
	tr.appendChild(td1)
	tr.appendChild(td2)
	tr.appendChild(td3)
	tr.appendChild(td4)
	tr.appendChild(td5)
	tr.appendChild(td6)
	
	subforum_rows.appendChild(tr)
	addedData.push([td2, td3])
}

function sendchanges(){
	if(editMode == 1){
		var request = new XMLHttpRequest();
		request.open('POST', window.location.pathname, true);

		request.onload = function() {
			window.location.reload()
		};

		var newSFS = [];
		for(i in addedData){
			var a = addedData[i][0].children[0].value
			var b = addedData[i][1].children[0].value
			newSFS.push([a,b])
		}
		
		request.send("newsubforums=" + encodeURIComponent(JSON.stringify(newSFS)));
	}
	if(editMode == 2){
		var ar = [];
		for(i in sfedit_inputs){
			ar.push([
				sfedit_inputs[i][0],
				sfedit_inputs[i][1].value,
				sfedit_inputs[i][2].value,
				sfedit_inputs[i][3].value
			])
		}
		
		var request = new XMLHttpRequest();
		request.open('POST', window.location.pathname, true);

		request.onload = function() {
			window.location.reload()
		};
		
		request.send("editedsfs=" + encodeURIComponent(JSON.stringify(ar)));
	}
}

var sfedit_inputs = [];
function editsubforums(){
	if(editMode !== null) return
	editMode = 2
	var chil = subforum_rows.children;
	for(var i = 0; i < chil.length; i++){
		if(chil[i].className == "sfrow") {
			var colChils = chil[i].children
			
			var input1 = document.createElement("input")
			var input2 = document.createElement("input")
			var input3 = document.createElement("input")
			
			input1.style.width = "98%"
			input2.style.width = "98%"
			input3.style.width = "98%"
			
			input1.value = colChils[1].innerText
			input2.value = colChils[2].innerText
			input3.value = colChils[5].innerText
			
			colChils[1].innerHTML = ""
			colChils[2].innerHTML = ""
			colChils[5].innerHTML = ""
			
			colChils[1].appendChild(input1)
			colChils[2].appendChild(input2)
			colChils[5].appendChild(input3)
			
			sfedit_inputs.push([colChils[0].innerText, input1, input2, input3])
		}
	}
}