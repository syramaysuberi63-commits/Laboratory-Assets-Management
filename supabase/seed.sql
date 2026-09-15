-- After creating Auth users, insert matching IDs here.
-- insert into public.profiles(id,email,full_name,role) values('AUTH-UUID','admin@example.com','Maria Santos','administrator');
insert into public.equipment(asset_code,name,category,condition,status) values
('LAP-001','Dell Latitude 5440','Laptop','Good','Available'),
('LAP-002','Lenovo ThinkPad E14','Laptop','Good','Borrowed'),
('CAM-001','Sony Alpha Camera','Camera','Good','Available'),
('PROJ-001','Epson Classroom Projector','Projector','Fair','Maintenance'),
('TAB-001','Samsung Galaxy Tab','Tablet','Good','Available') on conflict(asset_code) do nothing;
