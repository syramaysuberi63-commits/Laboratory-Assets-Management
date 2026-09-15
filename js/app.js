const S = {
  session: null,
  profile: null,
  page: "dashboard",
  equipment: [],
  requests: [],
  audit: [],
  maintenance: [],
};
const NAV = {
  administrator: [
    ["dashboard", "Overview"],
    ["requests", "Approvals"],
    ["equipment", "Equipment"],
    ["maintenance", "Maintenance"],
    ["users", "Users"],
    ["audit", "Audit Log"],
  ],
  staff: [
    ["dashboard", "Operations"],
    ["requests", "Borrowing"],
    ["equipment", "Equipment"],
    ["maintenance", "Maintenance"],
  ],
  requester: [
    ["dashboard", "My Space"],
    ["requests", "My Requests"],
    ["equipment", "Available Assets"],
  ],
};
const $ = (x) => document.querySelector(x),
  esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[c],
    );
const fmt = (x) => (x ? new Date(x).toLocaleString() : "—");
const badge = (x) => `<span class="badge ${x.toLowerCase()}">${esc(x)}</span>`;
const role = (x) =>
  ({
    administrator: "Administrator",
    staff: "Laboratory Staff",
    requester: "Requester / Viewer",
  })[x] || x;
function toast(m) {
  alert(m);
}
async function load() {
  let queries = [
    supabaseClient
      .from("equipment")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseClient
      .from("borrowing_requests")
      .select(
        "*,equipment(asset_code,name),requester:profiles!requester_id(full_name,email)",
      )
      .order("created_at", { ascending: false }),
    supabaseClient
      .from("maintenance_requests")
      .select(
        "*,equipment(asset_code,name),requester:profiles!requester_id(full_name)",
      )
      .order("created_at", { ascending: false }),
  ];
  if (S.profile.role == "administrator") {
    queries.push(
      supabaseClient
        .from("audit_logs")
        .select("*,profiles:user_id(full_name,email)")
        .order("created_at", { ascending: false })
        .limit(100),
    );
  }
  let [e, r, m, a] = await Promise.all(queries);
  if (e.error) throw e.error;
  if (r.error) throw r.error;
  if (m.error) throw m.error;
  if (a?.error) throw a.error;
  S.equipment = e.data || [];
  S.requests = r.data || [];
  S.audit = a?.data || [];
  S.maintenance = m.data || [];
}
function nav() {
  let items = NAV[S.profile.role];
  $("#nav").innerHTML = items
    .map(
      (x) =>
        `<button class="${S.page == x[0] ? "active" : ""}" data-page="${x[0]}">${x[1]}</button>`,
    )
    .join("");
  document
    .querySelectorAll("#nav button")
    .forEach((b) => (b.onclick = () => go(b.dataset.page)));
}
async function go(p) {
  S.page = p;
  nav();
  $("#title").textContent = {
    dashboard: "Overview",
    requests: "Borrowing",
    equipment: "Equipment",
    maintenance: "Maintenance",
    users: "Users",
    audit: "Audit Log",
  }[p];
  $("#kicker").textContent = {
    dashboard: "CONTROL CENTER",
    requests: "TRANSACTION QUEUE",
    equipment: "ASSET INVENTORY",
    maintenance: "SERVICE DESK",
    users: "ACCESS CONTROL",
    audit: "TRACEABILITY",
  }[p];
  try {
    if (p == "dashboard") dash();
    if (p == "requests") requests();
    if (p == "equipment") equipment();
    if (p == "maintenance") maintenance();
    if (p == "users") await users();
    if (p == "audit") audit();
  } catch (e) {
    $("#content").innerHTML =
      `<div class=empty><h2>Access denied / Error</h2><p>${esc(e.message)}</p></div>`;
  }
}
function dash() {
  let av = S.equipment.filter((x) => x.status == "Available").length,
    bo = S.equipment.filter((x) => x.status == "Borrowed").length,
    pe = S.requests.filter((x) => x.status == "Pending").length,
    ov = S.requests.filter((x) => x.status == "Overdue").length;
  $("#content").innerHTML =
    `<section class=hero><small>LIVE SYSTEM SNAPSHOT</small><h2>Command the asset lifecycle.</h2><p>Role-based controls, database-enforced business rules, and traceable critical actions.</p><div class=sticker>RBAC<br>RLS<br>AUDIT</div></section><div class=stats><article><small>AVAILABLE</small><b>${av}</b><span>Ready to request</span></article><article><small>BORROWED</small><b>${bo}</b><span>Currently released</span></article><article><small>PENDING</small><b>${pe}</b><span>Needs review</span></article><article><small>OVERDUE</small><b>${ov}</b><span>Needs attention</span></article></div><div class=grid><section class=panel><small>WORKFLOW</small><h3>Request lifecycle</h3><div class=workflow>${["Pending", "Approved", "Released", "Returned", "Closed"].map((x, i) => `<div><b>0${i + 1}</b><span>${x}</span></div>`).join("")}</div></section><section class=panel><small>RECENT</small><h3>Requests</h3>${
      S.requests
        .slice(0, 5)
        .map(
          (r) =>
            `<p class=row><strong>${esc(r.equipment?.asset_code)}</strong>${esc(r.equipment?.name)} ${badge(r.status)}</p>`,
        )
        .join("") || "No requests yet."
    }</section></div>`;
}
function requests() {
  let admin = S.profile.role == "administrator",
    req = S.profile.role == "requester",
    processor = ["administrator", "staff"].includes(S.profile.role),
    rows = req
      ? S.requests.filter((x) => x.requester_id == S.session.user.id)
      : S.requests;
  $("#content").innerHTML =
    `<div class=toolbar><p>${admin ? "Review requests. Only administrators can approve/reject." : req ? "Your request history and status." : "Create borrowing transactions, process returns, and update permitted records."}</p>${!admin ? `<button id=newReq>+ BORROW EQUIPMENT</button>` : ""}</div><section class=panel><table><thead><tr><th>Asset</th><th>Requester</th><th>Purpose</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${esc(r.equipment?.asset_code)}</b><small>${esc(r.equipment?.name)}</small></td><td>${esc(r.requester?.full_name || r.requester?.email)}</td><td>${esc(r.purpose)}</td><td>${badge(r.status)}</td><td>${fmt(r.created_at)}</td><td>${admin && r.status == "Pending" ? `<button onclick="act('approve',${r.id})">APPROVE</button> <button onclick="act('reject',${r.id})">REJECT</button>` : ""}${processor && r.status == "Approved" ? `<button onclick="act('release',${r.id})">RELEASE</button>` : ""}${processor && ["Released", "Overdue"].includes(r.status) ? `<button onclick="act('return',${r.id})">${S.profile.role == "staff" ? "PROCESS RETURN" : "RETURN"}</button>` : ""}</td></tr>`).join("") || `<tr><td colspan=6>No requests.</td></tr>`}</tbody></table></section>`;
  $("#newReq")?.addEventListener("click", openRequest);
}
function equipment() {
  let can = S.profile.role != "administrator";
  let admin = S.profile.role == "administrator";
  $("#content").innerHTML =
    `<div class=toolbar><p>View asset status and availability.</p>${admin ? `<button id="newEquipment">+ ADD EQUIPMENT</button>` : ""}</div><div class=assets>${S.equipment.map((e) => `<article><div><small>${esc(e.asset_code)}</small>${badge(e.status)}</div><i>${esc(e.category[0] || "A")}</i><h3>${esc(e.name)}</h3><p>${esc(e.category)} · ${esc(e.condition)}</p>${admin ? `<button onclick="openEquipment(${e.id})">EDIT</button>` : can && e.status == "Available" ? `<button onclick="openRequest(${e.id})">REQUEST THIS ↗</button>` : ""}</article>`).join("")}</div>`;
  $("#newEquipment")?.addEventListener("click", openEquipment);
}
function maintenance() {
  if (!["administrator", "staff"].includes(S.profile.role))
    throw Error(
      "Only Administrator or Laboratory Staff may access Maintenance.",
    );
  $("#content").innerHTML =
    `<div class=toolbar><p>Track equipment issues and service work.</p>${S.profile.role == "administrator" ? `<button id="newMaintenance">+ ADD MAINTENANCE</button>` : ""}</div><section class=panel><table><thead><tr><th>Asset</th><th>Issue</th><th>Requester</th><th>Status</th><th>Created</th>${S.profile.role == "administrator" ? "<th>Action</th>" : ""}</tr></thead><tbody>${S.maintenance.map((m) => `<tr><td>${esc(m.equipment?.asset_code)}</td><td>${esc(m.description)}</td><td>${esc(m.requester?.full_name)}</td><td>${badge(m.status)}</td><td>${fmt(m.created_at)}</td>${S.profile.role == "administrator" ? `<td><select onchange="updateMaintenanceStatus(${m.id}, this.value)"><option ${m.status == "Pending" ? "selected" : ""}>Pending</option><option ${m.status == "In Progress" ? "selected" : ""}>In Progress</option><option ${m.status == "Resolved" ? "selected" : ""}>Resolved</option><option ${m.status == "Rejected" ? "selected" : ""}>Rejected</option></select></td>` : ""}</tr>`).join("") || `<tr><td colspan="${S.profile.role == "administrator" ? 6 : 5}">No maintenance requests.</td></tr>`}</tbody></table></section>`;
  if (S.profile.role == "administrator") $("#newMaintenance").addEventListener("click", openMaintenance);
}
async function users() {
  if (S.profile.role != "administrator")
    throw Error("Only Administrator may access Users.");
  let { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .order("created_at");
  if (error) throw error;
  $("#content").innerHTML =
    `<section class=panel><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Action</th></tr></thead><tbody>${data.map((p) => `<tr><td>${esc(p.full_name)}</td><td>${esc(p.email)}</td><td><select id="role-${p.id}"><option value="requester" ${p.role == "requester" ? "selected" : ""}>Requester</option><option value="staff" ${p.role == "staff" ? "selected" : ""}>Laboratory Staff</option><option value="administrator" ${p.role == "administrator" ? "selected" : ""}>Administrator</option></select></td><td>${fmt(p.created_at)}</td><td><button onclick="updateUserRole('${p.id}')">SAVE ROLE</button></td></tr>`).join("")}</tbody></table></section>`;
}
function audit() {
  if (S.profile.role != "administrator")
    throw Error("Only Administrator may access Audit Log.");
  $("#content").innerHTML =
    `<section class=panel><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Record</th><th>Description</th></tr></thead><tbody>${S.audit.map((a) => `<tr><td>${fmt(a.created_at)}</td><td>${esc(a.profiles?.full_name || a.profiles?.email)}</td><td>${esc(a.action)}</td><td>${esc(a.module)}</td><td>#${a.record_id}</td><td>${esc(a.description)}</td></tr>`).join("") || "<tr><td colspan=6>No audit events.</td></tr>"}</tbody></table></section>`;
}
async function act(action, id) {
  let fn = {
    approve: "approve_borrowing_request",
    reject: "reject_borrowing_request",
    release: "release_borrowing_request",
    return: "return_borrowing_request",
  }[action];
  let { error } = await supabaseClient.rpc(fn, { p_request_id: id });
  if (error) return toast(error.message);
  toast("Transaction updated.");
  await load();
  go("requests");
}
function openRequest(id = "") {
  let av = S.equipment.filter((x) => x.status == "Available");
  if (!av.length) return toast("No available equipment.");
  $("#equipmentSelect").innerHTML = av
    .map(
      (e) =>
        `<option value="${e.id}" ${e.id == id ? "selected" : ""}>${esc(e.asset_code)} — ${esc(e.name)}</option>`,
    )
    .join("");
  let d = new Date(),
    e = new Date(Date.now() + 86400000);
  for (let [el, v] of [
    [$("#start"), d],
    [$("#end"), e],
  ]) {
    v.setMinutes(v.getMinutes() - v.getTimezoneOffset());
    el.value = v.toISOString().slice(0, 16);
  }
  $("#purpose").value = "";
  $("#requestModal").showModal();
}
function openMaintenance() {
  let choices = S.equipment.filter((item) => item.status != "Maintenance");
  if (!choices.length) return toast("All equipment is already under maintenance.");
  $("#maintenanceEquipment").innerHTML = choices
    .map(
      (item) =>
        `<option value="${item.id}">${esc(item.asset_code)} — ${esc(item.name)}</option>`,
    )
    .join("");
  $("#maintenanceDescription").value = "";
  $("#maintenanceModalTitle").textContent = "Add maintenance";
  $("#maintenanceSubmit").textContent = "ADD MAINTENANCE";
  $("#maintenanceModal").showModal();
}
function openEquipment(id = "") {
  $("#equipmentForm").reset();
  let item = S.equipment.find((equipment) => equipment.id == id);
  $("#equipmentId").value = item?.id || "";
  $("#equipmentCondition").value = item?.condition || "Good";
  $("#assetCode").value = item?.asset_code || "";
  $("#equipmentName").value = item?.name || "";
  $("#equipmentCategory").value = item?.category || "";
  $("#equipmentSubmit").textContent = item ? "SAVE EQUIPMENT" : "ADD EQUIPMENT";
  $("#equipmentModal").showModal();
}
async function updateUserRole(id) {
  let { error } = await supabaseClient.rpc("update_user_role", {
    p_user_id: id,
    p_role: $("#role-" + id).value,
  });
  if (error) return toast(error.message);
  toast("User role updated.");
  await load();
  go("users");
}
async function updateMaintenanceStatus(id, status) {
  let { error } = await supabaseClient.rpc("update_maintenance_status", {
    p_request_id: id,
    p_status: status,
  });
  if (error) return toast(error.message);
  toast("Maintenance status updated.");
  await load();
  go("maintenance");
}
$("#loginForm").onsubmit = async (e) => {
  e.preventDefault();
  let { data, error } = await supabaseClient.auth.signInWithPassword({
    email: $("#email").value,
    password: $("#password").value,
  });
  if (error) return toast(error.message);
  S.session = data.session;
  try {
    await boot();
  } catch (error) {
    await supabaseClient.auth.signOut();
    S.session = null;
    toast(error.message);
  }
};
$("#logout").onclick = async () => {
  await supabaseClient.auth.signOut();
  location.reload();
};
$("#requestForm").onsubmit = async (e) => {
  e.preventDefault();
  let { error } = await supabaseClient.rpc("submit_borrowing_request", {
    p_equipment_id: $("#equipmentSelect").value,
    p_purpose: $("#purpose").value,
    p_start_at: new Date($("#start").value).toISOString(),
    p_expected_return_at: new Date($("#end").value).toISOString(),
  });
  if (error) return toast(error.message);
  $("#requestModal").close();
  await load();
  go("requests");
};
$("#maintenanceForm").onsubmit = async (e) => {
  e.preventDefault();
  let { error } = await supabaseClient.rpc("create_maintenance_request", {
    p_equipment_id: $("#maintenanceEquipment").value,
    p_description: $("#maintenanceDescription").value,
  });
  if (error) return toast(error.message);
  $("#maintenanceModal").close();
  await load();
  go("maintenance");
};
$("#equipmentForm").onsubmit = async (e) => {
  e.preventDefault();
  let functionName = $("#equipmentId").value ? "update_equipment" : "create_equipment";
  let parameters = {
    p_asset_code: $("#assetCode").value,
    p_name: $("#equipmentName").value,
    p_category: $("#equipmentCategory").value,
    p_condition: $("#equipmentCondition").value,
  };
  if ($("#equipmentId").value) parameters.p_equipment_id = $("#equipmentId").value;
  let { error } = await supabaseClient.rpc(functionName, parameters);
  if (error) return toast(error.message);
  $("#equipmentModal").close();
  await load();
  go("equipment");
};
async function boot() {
  let { data, error } = await supabaseClient.rpc("ensure_profile");
  if (error) throw error;
  S.profile = data;
  await load();
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#role").textContent = role(S.profile.role);
  $("#user").textContent = S.profile.full_name || S.session.user.email;
  go("dashboard");
}
supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) {
    S.session = data.session;
    boot().catch((e) => toast(e.message));
  }
});
