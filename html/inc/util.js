function f_get_date() {
  var dt = new Date();
  var yyyy = dt.getFullYear();
  var mm = dt.getMonth() + 1;
  var dd = dt.getDate();
  if (mm < 10) { mm = '0' + mm; }
  if (dd < 10) { dd = '0' + dd; }
  var weekstr = new Array('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat');
  return yyyy + '/' + mm + '/' + dd + ' (' + weekstr[dt.getDay()] + ')';
}

function f_get_time() {
  var dt = new Date();
  var hh = dt.getHours();
  var mm = dt.getMinutes();
  var ss = dt.getSeconds();
  if (hh < 10) { hh = '0' + hh; }
  if (mm < 10) { mm = '0' + mm; }
  if (ss < 10) { ss = '0' + ss; }
  return hh + ':' + mm + ':' + ss;
}

function f_to_jpyear(year) {
  var nenngo = "西暦";
  var jpyear = year;
  if (year > 2018) {
    nenngo = "令和";
    jpyear = year - 2018;
  } else if (year > 1988) {
    nenngo = "平成";
    jpyear = year - 1988;
  } else if (year > 1925) {
    nenngo = "昭和";
    jpyear = year - 1925;
  } else if (year > 1911) {
    nenngo = "大正";
    jpyear = year - 1911;
  } else if (year > 1867) {
    nenngo = "明治";
    jpyear = year - 1867;
  }
  return nenngo + jpyear;
}

function js_clock() {
  var o = document.getElementById('clock');
  o.innerHTML = ""

  var D = new Date();
  var year = D.getFullYear();
  o.innerHTML += f_to_jpyear(year);
  o.innerHTML += '<br>'

  o.innerHTML += f_get_date();
  o.innerHTML += '<br>'
  o.innerHTML += f_get_time();
}

function js_init() {
  js_clock();
  setInterval('js_clock()', 1000);
}

function js_color(color, str) {
  return `<span class="${color}">${str}</span>`
}

function js_highlight() {
  document.addEventListener("DOMContentLoaded", function() {
    const bodyText = document.body.innerHTML;
    const updatedText = bodyText.replace(/\bTODO\b/g   , (match) => { return js_color('hi_orange'  , match) })
                                .replace(/\bDONE\b/g   , (match) => { return js_color('hi_green'   , match) })
                                .replace(/\bOK\b/g     , (match) => { return js_color('hi_green'   , match) })
                                .replace(/\bCANCEL\b/g , (match) => { return js_color('hi_red'     , match) })
                                .replace(/\bFAIL\b/g   , (match) => { return js_color('hi_red'     , match) })
                                .replace(/\bWIP\b/g    , (match) => { return js_color('hi_purple'  , match) })
                                .replace(/\bHIGH\b/g   , (match) => { return js_color('hi_red'     , match) })
                                .replace(/\bMIDDLE\b/g , (match) => { return js_color('hi_yellow'  , match) })
                                .replace(/\bLOW\b/g    , (match) => { return js_color('hi_green'   , match) })
                                .replace(/\bNe\b/g     , (match) => { return js_color('hi_red'     , match) })
                                .replace(/\bNi\b/g     , (match) => { return js_color('hi_red2'    , match) })
                                .replace(/\bTe\b/g     , (match) => { return js_color('hi_blue'    , match) })
                                .replace(/\bTi\b/g     , (match) => { return js_color('hi_blue2'   , match) })
                                .replace(/\bSe\b/g     , (match) => { return js_color('hi_yellow'  , match) })
                                .replace(/\bSi\b/g     , (match) => { return js_color('hi_yellow2' , match) })
                                .replace(/\bFe\b/g     , (match) => { return js_color('hi_green'   , match) })
                                .replace(/\bFi\b/g     , (match) => { return js_color('hi_green2'  , match) })
                                .replace(/\b.NT.\b/g   , (match) => { return js_color('hi_purple'  , match) })
                                .replace(/\b.NF.\b/g   , (match) => { return js_color('hi_green'   , match) })
                                .replace(/\b.S.J\b/g   , (match) => { return js_color('hi_blue'    , match) })
                                .replace(/\b.S.P\b/g   , (match) => { return js_color('hi_yellow'  , match) })
                                .replace(/朝食/g       , (match) => { return js_color('hi_yellow'  , match) })
                                .replace(/昼食/g       , (match) => { return js_color('hi_yellow'  , match) })
                                .replace(/夕食/g       , (match) => { return js_color('hi_yellow'  , match) })
                                .replace(/移動/g       , (match) => { return js_color('hi_red'     , match) })
                                .replace(/宿泊/g       , (match) => { return js_color('hi_green'   , match) })
                                .replace(/観光/g       , (match) => { return js_color('hi_blue'   , match) })
    ;
    document.body.innerHTML = updatedText;
  });
}

function js_markdeep_notoc() {
  markdeepOptions={tocStyle:'none'}
}
