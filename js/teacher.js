var teacherData=null,html5QrCode=null,scanHistory=[],attendanceStudents=[],attendanceSelections={},teacherAssignedClasses=[];

document.addEventListener('DOMContentLoaded',function(){
    teacherData=checkTeacherSession();if(!teacherData)return;
    document.getElementById('teacherName').textContent=teacherData.name||'Teacher';
    document.getElementById('teacherAvatar').textContent=(teacherData.name||'T')[0];
    document.getElementById('teacherSubject').textContent=teacherData.subject||'';
    document.getElementById('dateDisplay').textContent=new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    loadTeacherAssignedClasses();
});

function loadTeacherAssignedClasses(){
    apiCall({action:'getTeacherClasses',teacherId:teacherData.id}).then(function(r){
        teacherAssignedClasses=r.success?r.data:[];
        initTeacherFilters();
    });
}

function initTeacherFilters(){
    // Build options only from assigned classes
    var classSet={},secMap={};
    for(var i=0;i<teacherAssignedClasses.length;i++){
        var c=teacherAssignedClasses[i];
        classSet[c.className]=true;
        if(!secMap[c.className])secMap[c.className]=[];
        secMap[c.className].push(c.section);
    }
    var classKeys=Object.keys(classSet);
    var allOpts='<option value="">All Assigned</option>';
    var selOpts='<option value="">Select</option>';
    for(var j=0;j<classKeys.length;j++){
        allOpts+='<option value="'+classKeys[j]+'">Class '+classKeys[j]+'</option>';
        selOpts+='<option value="'+classKeys[j]+'">Class '+classKeys[j]+'</option>';
    }
    var allSecOpts='<option value="">All</option>';
    var selSecOpts='<option value="">Select</option>';
    // Collect all unique sections
    var allSecs={};
    for(var k=0;k<teacherAssignedClasses.length;k++) allSecs[teacherAssignedClasses[k].section]=true;
    var secKeys=Object.keys(allSecs);
    for(var m=0;m<secKeys.length;m++){
        allSecOpts+='<option value="'+secKeys[m]+'">'+secKeys[m]+'</option>';
        selSecOpts+='<option value="'+secKeys[m]+'">'+secKeys[m]+'</option>';
    }

    ['todayClass','tReportClass','tMonthlyClass'].forEach(function(id){var e=document.getElementById(id);if(e)e.innerHTML=allOpts;});
    ['todaySection','tReportSection','tMonthlySection'].forEach(function(id){var e=document.getElementById(id);if(e)e.innerHTML=allSecOpts;});
    var ac=document.getElementById('attendanceClass');if(ac)ac.innerHTML=selOpts;
    var as=document.getElementById('attendanceSection');if(as)as.innerHTML=selSecOpts;

    document.getElementById('attendanceDate').value=getTodayDate();
    document.getElementById('tReportDate').value=getTodayDate();
    var now=new Date();
    document.getElementById('tReportMonth').value=now.getMonth()+1;
    var yr=document.getElementById('tReportYear');if(yr){yr.innerHTML='';for(var y=now.getFullYear();y>=now.getFullYear()-5;y--)yr.innerHTML+='<option value="'+y+'">'+y+'</option>';}
}

function isClassAssigned(cls,sec){
    for(var i=0;i<teacherAssignedClasses.length;i++){
        if(teacherAssignedClasses[i].className===cls&&teacherAssignedClasses[i].section===sec)return true;
    }
    return false;
}

function showSection(section,el){
    var p=document.querySelectorAll('.section-page');for(var i=0;i<p.length;i++)p[i].classList.remove('active');
    var n=document.querySelectorAll('.nav-item');for(var j=0;j<n.length;j++)n[j].classList.remove('active');
    var t=document.getElementById('section-'+section);if(t)t.classList.add('active');
    if(el)el.classList.add('active');
    var titles={scanner:'QR Scanner',markAttendance:'Mark Attendance',todayList:"Today's Attendance",dayReport:'Day Report',monthlyReport:'Monthly Report'};
    document.getElementById('pageTitle').textContent=titles[section]||'';
    if(section==='todayList')loadTodayList();
    if(section!=='scanner'&&html5QrCode){try{html5QrCode.stop();}catch(e){}document.getElementById('startScanBtn').style.display='inline-flex';document.getElementById('stopScanBtn').style.display='none';}
    document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('show');
}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('show');}

// SCANNER
function startScanner(){
    document.getElementById('startScanBtn').style.display='none';document.getElementById('stopScanBtn').style.display='inline-flex';document.getElementById('studentPreview').style.display='none';
    html5QrCode=new Html5Qrcode("reader");
    html5QrCode.start({facingMode:"environment"},{fps:10,qrbox:{width:250,height:250},aspectRatio:1},onScanSuccess,function(){}).catch(function(){showToast('Camera access denied','error');document.getElementById('startScanBtn').style.display='inline-flex';document.getElementById('stopScanBtn').style.display='none';});
}
function stopScanner(){if(html5QrCode){html5QrCode.stop().then(function(){document.getElementById('startScanBtn').style.display='inline-flex';document.getElementById('stopScanBtn').style.display='none';}).catch(function(){});}}

function onScanSuccess(decoded){
    if(html5QrCode){try{html5QrCode.pause(true);}catch(e){}}
    if(navigator.vibrate)navigator.vibrate(200);
    apiCall({action:'getStudentByQR',qrData:decoded}).then(function(r){
        if(r.success){
            var st=r.data;
            // Check if this student's class is assigned to this teacher
            if(!isClassAssigned(st.class,st.section)){
                showToast('This student (Class '+st.class+'-'+st.section+') is not in your assigned classes','error');
                if(html5QrCode){try{html5QrCode.resume();}catch(e){}}
                return;
            }
            showStudentPreview(st);
        }else{showToast('Student not found','error');if(html5QrCode){try{html5QrCode.resume();}catch(e){}}}
    });
}

function showStudentPreview(st){
    var p=document.getElementById('studentPreview');p.style.display='block';
    p.innerHTML='<div class="student-preview fade-in"><div class="preview-header"><div class="preview-avatar">'+st.name[0]+'</div><div class="preview-info"><h3>'+st.name+'</h3><p>'+st.id+'</p></div></div><div class="preview-details"><div class="detail-item"><span class="label">CLASS</span><span class="value">'+st.class+'</span></div><div class="detail-item"><span class="label">SECTION</span><span class="value">'+st.section+'</span></div><div class="detail-item"><span class="label">GENDER</span><span class="value">'+st.gender+'</span></div><div class="detail-item"><span class="label">FATHER</span><span class="value">'+(st.fatherName||'-')+'</span></div></div><div class="attendance-actions"><button class="btn btn-success" onclick="markFromScan(\''+st.id+'\',\''+st.name.replace(/'/g,"\\'")+'\',\''+st.class+'\',\''+st.section+'\',\'Present\')">Present</button><button class="btn btn-danger" onclick="markFromScan(\''+st.id+'\',\''+st.name.replace(/'/g,"\\'")+'\',\''+st.class+'\',\''+st.section+'\',\'Absent\')">Absent</button><button class="btn btn-warning" onclick="markFromScan(\''+st.id+'\',\''+st.name.replace(/'/g,"\\'")+'\',\''+st.class+'\',\''+st.section+'\',\'Leave\')">Leave</button></div></div>';
    p.scrollIntoView({behavior:'smooth'});
}

function markFromScan(sid,name,cls,sec,status){
    apiCall({action:'markAttendance',studentId:sid,studentName:name,class:cls,section:sec,date:getTodayDate(),status:status,markedBy:teacherData.name}).then(function(r){
        if(r.success){showToast(r.message,'success');scanHistory.unshift({name:name,id:sid,status:status,time:new Date().toLocaleTimeString()});updateScanHistory();document.getElementById('studentPreview').style.display='none';if(html5QrCode){try{html5QrCode.resume();}catch(e){}}}
        else showToast(r.message,'error');
    });
}

function updateScanHistory(){var c=document.getElementById('scanHistory');if(!scanHistory.length){c.innerHTML='<p style="color:var(--text-light);font-size:13px">No scans yet</p>';return;}var h='';for(var i=0;i<Math.min(scanHistory.length,20);i++){var sc=scanHistory[i];h+='<div class="attendance-list-item"><div class="student-info-brief"><div class="mini-avatar">'+sc.name[0]+'</div><div><div class="name">'+sc.name+'</div><div class="sub-info">'+sc.id+' &middot; '+sc.time+'</div></div></div><span class="badge badge-'+sc.status.toLowerCase()+'">'+sc.status+'</span></div>';}c.innerHTML=h;}

// MANUAL ATTENDANCE - Only assigned classes
function loadStudentsForAttendance(){
    var date=document.getElementById('attendanceDate').value;
    var cls=document.getElementById('attendanceClass').value;
    var sec=document.getElementById('attendanceSection').value;
    if(!cls||!sec){showToast('Select class and section','warning');return;}
    if(!isClassAssigned(cls,sec)){showToast('Class '+cls+'-'+sec+' is not assigned to you','error');return;}
    attendanceSelections={};
    apiCall({action:'getStudents',class:cls,section:sec}).then(function(sr){
        if(!sr.success||!sr.data||!sr.data.length){document.getElementById('attendanceList').innerHTML='<div class="empty-state"><h3>No students found</h3></div>';return;}
        attendanceStudents=sr.data;
        apiCall({action:'getAttendance',date:date,class:cls,section:sec}).then(function(ar){
            var existing={};if(ar.success&&ar.data)for(var a=0;a<ar.data.length;a++)existing[ar.data[a].studentId]=ar.data[a].status;
            var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px"><p><strong>Class '+cls+'-'+sec+'</strong> | '+attendanceStudents.length+' students | '+formatDate(date)+'</p><div class="btn-group"><button class="btn btn-success btn-sm" onclick="markAllStatus(\'Present\')">All Present</button><button class="btn btn-danger btn-sm" onclick="markAllStatus(\'Absent\')">All Absent</button></div></div>';
            for(var i=0;i<attendanceStudents.length;i++){var st=attendanceStudents[i];var cs=existing[st.id]||'';if(cs)attendanceSelections[st.id]=cs;h+='<div class="attendance-list-item"><div class="student-info-brief"><div class="mini-avatar">'+st.name[0]+'</div><div><div class="name">'+st.name+'</div><div class="sub-info">'+st.id+' &middot; '+st.gender+'</div></div></div><div class="status-toggle"><button class="status-btn'+(cs==='Present'?' active-present':'')+'" onclick="toggleStatus(\''+st.id+'\',\'Present\',this)">P</button><button class="status-btn'+(cs==='Absent'?' active-absent':'')+'" onclick="toggleStatus(\''+st.id+'\',\'Absent\',this)">A</button><button class="status-btn'+(cs==='Leave'?' active-leave':'')+'" onclick="toggleStatus(\''+st.id+'\',\'Leave\',this)">L</button></div></div>';}
            h+='<div style="margin-top:16px"><button class="btn btn-primary btn-block btn-lg" onclick="submitBulkAttendance()">Save Attendance</button></div>';
            document.getElementById('attendanceList').innerHTML=h;
        });
    });
}

function toggleStatus(sid,status,btn){var p=btn.parentElement;var bs=p.querySelectorAll('.status-btn');for(var i=0;i<bs.length;i++)bs[i].classList.remove('active-present','active-absent','active-leave');btn.classList.add('active-'+status.toLowerCase());attendanceSelections[sid]=status;}

function markAllStatus(status){for(var i=0;i<attendanceStudents.length;i++)attendanceSelections[attendanceStudents[i].id]=status;var bs=document.querySelectorAll('.status-btn');for(var j=0;j<bs.length;j++)bs[j].classList.remove('active-present','active-absent','active-leave');var ch=status[0];for(var k=0;k<bs.length;k++){if(bs[k].textContent.trim()===ch)bs[k].classList.add('active-'+status.toLowerCase());}showToast('All marked as '+status,'info');}

function submitBulkAttendance(){var date=document.getElementById('attendanceDate').value;var records=[];for(var i=0;i<attendanceStudents.length;i++){var st=attendanceStudents[i];records.push({studentId:st.id,studentName:st.name,class:st.class,section:st.section,date:date,status:attendanceSelections[st.id]||'Absent',markedBy:teacherData.name});}if(!records.length){showToast('No students','warning');return;}apiCall({action:'markBulkAttendance',records:JSON.stringify(records)}).then(function(r){if(r.success)showToast(r.message,'success');else showToast(r.message,'error');});}

// TODAY'S LIST - Only assigned classes, fixed to show actual status
function loadTodayList(){
    var cls=document.getElementById('todayClass').value;
    var sec=document.getElementById('todaySection').value;
    var params={action:'getDayReport',date:getTodayDate()};
    if(cls)params.class=cls;
    if(sec)params.section=sec;
    apiCall(params).then(function(r){
        if(!r.success)return;
        // Filter to only assigned classes
        var filtered=[];
        if(r.data){
            for(var i=0;i<r.data.length;i++){
                var row=r.data[i];
                if(isClassAssigned(row.class,row.section)){filtered.push(row);}
            }
        }
        var present=0,absent=0,leave=0;
        for(var j=0;j<filtered.length;j++){
            if(filtered[j].status==='Present')present++;
            else if(filtered[j].status==='Leave')leave++;
            else absent++;
        }
        var h='<div class="stats-grid" style="margin-bottom:12px"><div class="stat-card success"><div class="stat-icon">P</div><div class="stat-details"><h4>'+present+'</h4><p>Present</p></div></div><div class="stat-card danger"><div class="stat-icon">A</div><div class="stat-details"><h4>'+absent+'</h4><p>Absent</p></div></div><div class="stat-card warning"><div class="stat-icon">L</div><div class="stat-details"><h4>'+leave+'</h4><p>Leave</p></div></div></div>';
        for(var k=0;k<filtered.length;k++){
            var row2=filtered[k];
            var bg=row2.status==='Present'?'var(--success)':(row2.status==='Leave'?'var(--warning)':'var(--danger)');
            h+='<div class="attendance-list-item"><div class="student-info-brief"><div class="mini-avatar" style="background:'+bg+'">'+row2.name[0]+'</div><div><div class="name">'+row2.name+'</div><div class="sub-info">Class '+row2.class+'-'+row2.section+' &middot; '+row2.gender+'</div></div></div><div style="display:flex;align-items:center;gap:6px"><span class="badge badge-'+row2.status.toLowerCase()+'">'+row2.status+'</span>';
            if(row2.status==='Absent'){h+='<button class="btn btn-warning btn-sm" onclick="changeToLeave(\''+row2.studentId+'\',\''+row2.name.replace(/'/g,"\\'")+'\')">Mark Leave</button>';}
            if(row2.status!=='Present'){h+='<button class="btn btn-success btn-sm" onclick="changeToPresent(\''+row2.studentId+'\',\''+row2.name.replace(/'/g,"\\'")+'\')">Mark Present</button>';}
            h+='</div></div>';
        }
        if(!filtered.length)h+='<div class="empty-state"><h3>No records for your assigned classes</h3></div>';
        document.getElementById('todayListContainer').innerHTML=h;
    });
}

function changeToLeave(sid,name){apiCall({action:'updateAttendance',studentId:sid,date:getTodayDate(),status:'Leave',modifiedBy:teacherData.name}).then(function(r){if(r.success){showToast(name+' marked as Leave','success');loadTodayList();}else showToast(r.message,'error');});}
function changeToPresent(sid,name){apiCall({action:'updateAttendance',studentId:sid,date:getTodayDate(),status:'Present',modifiedBy:teacherData.name}).then(function(r){if(r.success){showToast(name+' marked as Present','success');loadTodayList();}else showToast(r.message,'error');});}

// DAY REPORT - filtered to assigned classes
function loadTeacherDayReport(){
    var d=document.getElementById('tReportDate').value;var c=document.getElementById('tReportClass').value;var sec=document.getElementById('tReportSection').value;
    if(!d){showToast('Select date','warning');return;}
    var p={action:'getDayReport',date:d};if(c)p.class=c;if(sec)p.section=sec;
    apiCall(p).then(function(r){
        if(!r.success)return;
        var filtered=[];if(r.data)for(var i=0;i<r.data.length;i++){if(isClassAssigned(r.data[i].class,r.data[i].section))filtered.push(r.data[i]);}
        var pr=0,ab=0,lv=0;for(var j=0;j<filtered.length;j++){if(filtered[j].status==='Present')pr++;else if(filtered[j].status==='Leave')lv++;else ab++;}
        var total=filtered.length;var pct=total>0?Math.round((pr/total)*100):0;
        var h='<h3 style="text-align:center;margin-bottom:12px">'+formatDate(d)+'</h3><div class="stats-grid"><div class="stat-card"><div class="stat-icon">T</div><div class="stat-details"><h4>'+total+'</h4><p>Total</p></div></div><div class="stat-card success"><div class="stat-icon">P</div><div class="stat-details"><h4>'+pr+'</h4><p>Present</p></div></div><div class="stat-card danger"><div class="stat-icon">A</div><div class="stat-details"><h4>'+ab+'</h4><p>Absent</p></div></div><div class="stat-card warning"><div class="stat-icon">L</div><div class="stat-details"><h4>'+lv+'</h4><p>Leave</p></div></div></div><div style="text-align:center;margin:12px 0"><h2 style="color:var(--primary)">'+pct+'%</h2></div>';
        if(filtered.length){h+='<div class="table-responsive"><table class="data-table"><thead><tr><th>#</th><th>Name</th><th>Class</th><th>Gender</th><th>Status</th></tr></thead><tbody>';for(var k=0;k<filtered.length;k++){var row=filtered[k];h+='<tr><td>'+(k+1)+'</td><td><strong>'+row.name+'</strong></td><td>'+row.class+'-'+row.section+'</td><td>'+row.gender+'</td><td><span class="badge badge-'+row.status.toLowerCase()+'">'+row.status+'</span></td></tr>';}h+='</tbody></table></div>';}
        document.getElementById('tDayReportContent').innerHTML=h;
    });
}

// MONTHLY REPORT - filtered to assigned classes
function loadTeacherMonthlyReport(){
    var m=document.getElementById('tReportMonth').value;var y=document.getElementById('tReportYear').value;var c=document.getElementById('tMonthlyClass').value;var sec=document.getElementById('tMonthlySection').value;
    var p={action:'getMonthlyReport',month:m,year:y};if(c)p.class=c;if(sec)p.section=sec;
    apiCall(p).then(function(r){
        if(!r.success)return;
        // Filter to assigned classes
        var filtered=[];if(r.data)for(var i=0;i<r.data.length;i++){if(isClassAssigned(r.data[i].class,r.data[i].section))filtered.push(r.data[i]);}
        var boys=0,girls=0,totalPresent=0;
        for(var j=0;j<filtered.length;j++){if(filtered[j].gender==='Male')boys++;else girls++;totalPresent+=filtered[j].present;}
        var avgAtt=(filtered.length>0&&r.summary.totalMeetings>0)?Math.round((totalPresent/(filtered.length*r.summary.totalMeetings))*100):0;
        var h='<h3 style="text-align:center;margin-bottom:12px">'+getMonthName(parseInt(m))+' '+y+'</h3><div class="stats-grid"><div class="stat-card"><div class="stat-icon">M</div><div class="stat-details"><h4>'+r.summary.totalMeetings+'</h4><p>Meetings</p></div></div><div class="stat-card info"><div class="stat-icon">S</div><div class="stat-details"><h4>'+filtered.length+'</h4><p>Students</p></div></div><div class="stat-card success"><div class="stat-icon">%</div><div class="stat-details"><h4>'+avgAtt+'%</h4><p>Avg Attendance</p></div></div><div class="stat-card info"><div class="stat-icon">B</div><div class="stat-details"><h4>'+boys+'</h4><p>Boys</p></div></div><div class="stat-card"><div class="stat-icon">G</div><div class="stat-details"><h4>'+girls+'</h4><p>Girls</p></div></div></div>';
        if(filtered.length){h+='<div class="table-responsive"><table class="data-table"><thead><tr><th>#</th><th>Name</th><th>Class</th><th>Present</th><th>Absent</th><th>Leave</th><th>%</th></tr></thead><tbody>';for(var k=0;k<filtered.length;k++){var row=filtered[k];h+='<tr><td>'+(k+1)+'</td><td><strong>'+row.name+'</strong></td><td>'+row.class+'-'+row.section+'</td><td><span class="badge badge-present">'+row.present+'</span></td><td><span class="badge badge-absent">'+row.absent+'</span></td><td><span class="badge badge-leave">'+row.leave+'</span></td><td><strong>'+row.percentage+'%</strong></td></tr>';}h+='</tbody></table></div>';}
        document.getElementById('tMonthlyReportContent').innerHTML=h;
    });
}