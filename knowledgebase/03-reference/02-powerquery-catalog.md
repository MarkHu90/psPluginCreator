# PowerSchool SIS 内置 PowerQuery 目录（自动生成）

> 来源：PowerSchool Developer Portal → PowerQuery Resources 的 Swagger 2.0 规范（`/webservices/developer/media/file/176`）。
> 抓取日期：2026-11-06。共 **438** 个内置 PowerQuery。

所有内置查询均为 `POST /ws/schema/query/{name}`。插件可以在自己的 `<access_request>` 申请对应字段后直接调用；但要通过**内部 API**（浏览器会话）调用，还需要在插件里为该查询配置 permission mapping。

## 按领域分组

| 领域（name 第 4 段） | 数量 |
| --- | --- |
| `health` | 78 |
| `codeset` | 39 |
| `attendance` | 36 |
| `student` | 26 |
| `careertech` | 22 |
| `asset` | 15 |
| `terms` | 14 |
| `dats` | 13 |
| `batchschoolsetup` | 11 |
| `graduation_planner` | 11 |
| `plugin` | 11 |
| `assignmentScore` | 10 |
| `schools` | 10 |
| `school` | 9 |
| `users` | 9 |
| `calendar` | 8 |
| `incident` | 8 |
| `termbins` | 8 |
| `contacts` | 7 |
| `staff` | 7 |
| `assignmentSection` | 6 |
| `courses` | 6 |
| `autocomplete` | 5 |
| `performance` | 5 |
| `scheduling` | 5 |
| `students` | 4 |
| `access_roles` | 3 |
| `cc` | 3 |
| `contact` | 3 |
| `teachers` | 3 |
| `customization` | 2 |
| `documents` | 2 |
| `enterprisereporting` | 2 |
| `guardian` | 2 |
| `medication` | 2 |
| `mobile-app-shell-bff` | 2 |
| `roledef` | 2 |
| `sections` | 2 |
| `templatemanagement` | 2 |
| `test` | 2 |
| `all` | 1 |
| `codesetReportedValueOpts` | 1 |
| `commentbank` | 1 |
| `consecutive_absence_counts_by_school` | 1 |
| `consecutive_absence_detail_by_school` | 1 |
| `coursegroups` | 1 |
| `demographics` | 1 |
| `detail_grade_history` | 1 |
| `district` | 1 |
| `document_attachment` | 1 |
| `fee` | 1 |
| `gender_pronouns` | 1 |
| `gradescaleitem` | 1 |
| `notifications` | 1 |
| `page_permissions` | 1 |
| `person` | 1 |
| `scheduledevent` | 1 |
| `signed` | 1 |
| `student_school_enrollment_check` | 1 |
| `summer_school_enrollment` | 1 |
| `teacherCategory` | 1 |
| `testscore` | 1 |
| `workflow` | 1 |

## `access_roles`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.access_roles.district_users` | Users: Access Role Membership (District) |
| `com.powerschool.core.access_roles.school_users` | Users: Access Role Membership (School) |
| `com.powerschool.core.access_roles.school_users_by_roleavailableaccess` | Users: Access Role Available Access by school |

## `all`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.get.all.details.for.school` | School detail for Years and Terms, Calendar and Reporting Terms |

## `asset`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.asset.asset_active_count` | Asset: Active Count |
| `com.powerschool.core.asset.asset_cascade_delete_count` | Asset: Asset Cascade Delete Count |
| `com.powerschool.core.asset.asset_inventory` | Asset: List of asset inventory |
| `com.powerschool.core.asset.asset_list` | Asset: List of asset |
| `com.powerschool.core.asset.asset_list_by_coursesdcids` | Asset:Get List of asset by COURSESDCID |
| `com.powerschool.core.asset.asset_ownership` | Asset: List of asset ownership |
| `com.powerschool.core.asset.assetinv_list_by_studentsdcids` | Asset:Get List of assetinv by studentsdcid |
| `com.powerschool.core.asset.book_list` | Asset: List of recommended books |
| `com.powerschool.core.asset.checkedout_assets` | Asset: List of assets which are currently checked out |
| `com.powerschool.core.asset.course_associated_student_assets` | ASSETINVOWNER: List of enrolled courses and associated assets and inventory ownership |
| `com.powerschool.core.asset.course_independent_student_assets` | ASSETINVOWNER: List of course independent assets and inventory ownership |
| `com.powerschool.core.asset.courses` | Courses: List of courses |
| `com.powerschool.core.asset.fetch_checkedout_assets` | Asset: Checkedout Count |
| `com.powerschool.core.asset.inventory_list` | Asset: List of assettags |
| `com.powerschool.core.asset.ownership_history_for_an_asset_inventory` | ASSETINVOWNER: List of asset ownership for an asset inventory |

## `assignmentScore`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.assignmentScore.one_roster_extractor_result_by_id` | OneRoster Support for GET Single Result |
| `com.powerschool.core.assignmentScore.one_roster_extractor_results` | OneRoster Support for GET Results |
| `com.powerschool.core.assignmentScore.one_roster_extractor_results_for_class` | OneRoster Support for GET Results For Class |
| `com.powerschool.core.assignmentScore.one_roster_extractor_results_for_class_v12` | OneRoster Support for GET Results For Class |
| `com.powerschool.core.assignmentScore.one_roster_extractor_results_for_lineItem_in_class` | OneRoster Support for GET Results for Lineitems in class |
| `com.powerschool.core.assignmentScore.one_roster_extractor_results_for_lineItem_in_class_v12` | OneRoster Support for GET Results for Lineitems in class |
| `com.powerschool.core.assignmentScore.one_roster_extractor_results_for_student_in_class` | OneRoster Support for GET Results |
| `com.powerschool.core.assignmentScore.one_roster_extractor_results_for_student_in_class_v12` | OneRoster Support for GET Results |
| `com.powerschool.core.assignmentScore.one_roster_extractor_results_v12` | OneRoster Support for GET Results |
| `com.powerschool.core.assignmentScore.one_roster_extractor_userId_actualScoreGradeScaleDcid` | OneRoster Support to get userId and actualScoreGradescaleDcid |

## `assignmentSection`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.assignmentSection.one_roster_extractor_line_item_by_id` | OneRoster Support for GET Single Line Item |
| `com.powerschool.core.assignmentSection.one_roster_extractor_line_items` | OneRoster Support for GET Line Items |
| `com.powerschool.core.assignmentSection.one_roster_extractor_line_items_for_class` | OneRoster Support for GET Line Items For Class |
| `com.powerschool.core.assignmentSection.one_roster_extractor_line_items_for_class_v12` | OneRoster Support for GET Line Items For Class |
| `com.powerschool.core.assignmentSection.one_roster_extractor_line_items_v12` | OneRoster Support for GET Line Items |
| `com.powerschool.core.assignmentSection.one_roster_extractor_userId` | OneRoster Support to get lead teacher userId |

## `attendance`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.attendance.attendance_code_by_school_date` | Attendance: Codes by School and Date |
| `com.pearson.core.attendance.attendance_record_mode_by_school_date` | Get attendance record modes by school and date |
| `com.pearson.core.attendance.attendance_totals` | Attendance: Totals |
| `com.pearson.core.attendance.attendance_totals_by_student` | Attendance: Totals by Student |
| `com.pearson.core.attendance.categories_and_codes` | Attendance: Categories and Codes |
| `com.pearson.core.attendance.codes` | Attendance: Attendance Codes |
| `com.pearson.core.attendance.daily_attendance` | Attendance: Daily |
| `com.pearson.core.attendance.daily_attendance_template` | Attendance: Daily Attendance Template |
| `com.pearson.core.attendance.find_all_attendance_with_comments` | Attendance: Find all attendance with comments |
| `com.pearson.core.attendance.find_student` | Attendance: Find Student |
| `com.pearson.core.attendance.get_student_attendance_comments` | Attendance: Get a student's attendance comments |
| `com.pearson.core.attendance.meeting_attendance` | Attendance: Meeting |
| `com.pearson.core.attendance.meeting_interval_attendance_template` | Attendance: Meeting/Interval Attendance Template |
| `com.pearson.core.attendance.meeting_submission_status` | Attendance: Meeting Submission Status |
| `com.pearson.core.attendance.periods` | Attendance: Periods |
| `com.pearson.core.attendance.special_program` | Attendance: Special Programs |
| `com.pearson.core.attendance.student_attendance_detail` | Attendance: Student Details |
| `com.pearson.core.attendance.time_attendance_template` | Attendance: Time Attendance Template |
| `com.powerschool.core.attendance.codes_by_year_and_school` | Attendance: Attendance Codes by year |
| `com.powerschool.core.attendance.count_attendance_out_of_expression` | Attendance: Count of Attendance associated with Schedule Expression. |
| `com.powerschool.core.attendance.count_attendance_out_of_term` | Attendance: Count of Attendance associated with Term |
| `com.powerschool.core.attendance.count_forward_attendance` | Attendance: Count of Forward Attendance |
| `com.powerschool.core.attendance.daily_log_attendance` | Attendance: Single day, single student, Meeting, Daily, and Clock In/Out |
| `com.powerschool.core.attendance.meeting.time.periods` | Attendance: Meeting Periods with Time In/Out entries |
| `com.powerschool.core.attendance.meeting_attendance_time` | Attendance: Meeting Attendance Clock-ins and Clock-outs |
| `com.powerschool.core.attendance.mini_meeting_report_minutes` | Attendance: Obtain data for mini meeting report |
| `com.powerschool.core.attendance.period.schedule.by.day` | Attendance: Meeting Periods with start and end times |
| `com.powerschool.core.attendance.period.schedule.for.student.and.day` | Attendance: Meeting Periods with start and end times for a specific student and day |
| `com.powerschool.core.attendance.potential_and_attendance_minutes` | Attendance: Potential and Actual Minutes |
| `com.powerschool.core.attendance.student.count.meeting` | Attendance: Count of non default attendance code meeting records for a date range |
| `com.powerschool.core.attendance.student.daily` | Attendance: Daily time record |
| `com.powerschool.core.attendance.student.daily_clock` | Attendance: Daily time clock In/Out records |
| `com.powerschool.core.attendance.student.daily_clock_for_multiple_days` | Attendance: Daily time clock In/Out records for multiple days |
| `com.powerschool.core.attendance.student.days.not.in.session` | Attendance: Get all days not insession for a date range |
| `com.powerschool.core.attendance.student.multiple.daily` | Attendance: Daily time record for multiple days |
| `com.powerschool.core.attendance.student_clockinout_data` | Attendance: Clockin/out data for printing Admit Slip |

## `autocomplete`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.autocomplete.newfee.courses` | Autocomplete - NewFee Active Courses |
| `com.powerschool.core.autocomplete.powerscheduler.courses` | Autocomplete - PowerScheduler Courses |
| `com.powerschool.core.autocomplete.powerscheduler.next_year_students` | Autocomplete - PowerScheduler Next Year Students |
| `com.powerschool.core.autocomplete.powerscheduler.rooms` | Autocomplete - PowerScheduler Rooms |
| `com.powerschool.core.autocomplete.powerscheduler.teachers` | Autocomplete - PowerScheduler Teachers |

## `batchschoolsetup`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.batchschoolsetup.display_school_settings` | Filtered List of Schools Admin User Can Access and other set up information such as year, terms, cal… |
| `com.powerschool.core.batchschoolsetup.districtcalendar` | District Calendar Definition |
| `com.powerschool.core.batchschoolsetup.get_school_pref_att_quicklkup_class_count` | Prefs: Returns the Pref Value for Count Multi-Period Meeting attendance once per day for a school an… |
| `com.powerschool.core.batchschoolsetup.get_school_pref_show_citizenship` | Prefs: Returns the Show CitizenShip Value for a school |
| `com.powerschool.core.batchschoolsetup.get_school_year` | Terms: Get School Year |
| `com.powerschool.core.batchschoolsetup.get_updated_target_schools` | Schools: List of Target Schools |
| `com.powerschool.core.batchschoolsetup.header_year` | Batch School Setup Header Year |
| `com.powerschool.core.batchschoolsetup.list_of_terms` | Terms: All terms for a school and year |
| `com.powerschool.core.batchschoolsetup.quick_lookup_target_schools_list` | Schools: List of Target Schools for Quick Lookup |
| `com.powerschool.core.batchschoolsetup.reporting_terms_target_schools_list` | Schools: List of Target Schools for Reporting Terms |
| `com.powerschool.core.batchschoolsetup.years_target_schools_list` | Schools: List of Target Schools for Years |

## `calendar`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.calendar.district_auto_calendar_settings` | Calendar: District Auto Settings |
| `com.pearson.core.calendar.district_bell_schedules` | Calendar: District Bell Schedules |
| `com.pearson.core.calendar.district_calendar` | Calendar: District Calendar |
| `com.pearson.core.calendar.district_cycle_days` | Calendar: District Cycle Days |
| `com.pearson.core.calendar.membership_type` | Calendar: Membership Types |
| `com.pearson.core.calendar.school_auto_calendar_settings` | Calendar: School Auto Settings |
| `com.pearson.core.calendar.school_bell_schedules` | Calendar: School Bell Schedule |
| `com.pearson.core.calendar.school_cycle_days` | Calendar: School Cycle Days |

## `careertech`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.careertech.get_careertech_courses_by_studentid` | AcademicAndCareerPlans: Get CareerTech Courses by StudentId |
| `com.powerschool.core.careertech.get_cluster_types_for_year` | AcademicAndCareerPlans: Get Cluster Types |
| `com.powerschool.core.careertech.get_clusters_for_year` | AcademicAndCareerPlans: Get Clusters |
| `com.powerschool.core.careertech.get_credential_types_for_year` | AcademicAndCareerPlans: Get Credential Types |
| `com.powerschool.core.careertech.get_credentials_for_student_and_year` | AcademicAndCareerPlans: Get Student Credentials |
| `com.powerschool.core.careertech.get_credentials_for_year` | AcademicAndCareerPlans: Get Credentials |
| `com.powerschool.core.careertech.get_credentials_ispassed_for_student` | AcademicAndCareerPlans: Get Number Of Student Credentials |
| `com.powerschool.core.careertech.get_credentials_with_programs_and_clusters_for_year` | AcademicAndCareerPlans: Get Credentials with Programs and Clusters |
| `com.powerschool.core.careertech.get_declared_programs_for_student_and_year` | AcademicAndCareerPlans: Get Student Declared Programs |
| `com.powerschool.core.careertech.get_declared_programs_for_year` | AcademicAndCareerPlans: Get Declared Programs |
| `com.powerschool.core.careertech.get_localities_for_year` | AcademicAndCareerPlans: Get Localities |
| `com.powerschool.core.careertech.get_localities_for_year_with_active_sites` | AcademicAndCareerPlans: Get Localities with Active Sites |
| `com.powerschool.core.careertech.get_program_types_for_year` | AcademicAndCareerPlans: Get Program Types |
| `com.powerschool.core.careertech.get_programs_by_clusterid` | AcademicAndCareerPlans: Get Programs by ClusterId |
| `com.powerschool.core.careertech.get_programs_for_year` | AcademicAndCareerPlans: Get Programs |
| `com.powerschool.core.careertech.get_reimbursements_for_year` | AcademicAndCareerPlans: Get Reimbursements |
| `com.powerschool.core.careertech.get_school_for_year_and_school` | AcademicAndCareerPlans: Get School |
| `com.powerschool.core.careertech.get_sites_by_localityid` | AcademicAndCareerPlans: Get Sites By Locality ID |
| `com.powerschool.core.careertech.get_sites_for_year` | AcademicAndCareerPlans: Get Sites |
| `com.powerschool.core.careertech.get_sites_with_localities_for_year` | AcademicAndCareerPlans: Get Sites with Localities |
| `com.powerschool.core.careertech.get_undeclared_school_sites_for_year` | AcademicAndCareerPlans: Get Undeclared School Sites for Year |
| `com.powerschool.core.careertech.get_undeclared_school_sites_for_year_and_locality` | AcademicAndCareerPlans: Get Undeclared School Sites for Year |

## `cc`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.cc.one_roster_extractor_enrollments` | OneRoster Support for GET Enrollments |
| `com.powerschool.core.cc.one_roster_extractor_enrollments_for_class_in_school` | OneRoster Support for GET Enrollments for a school |
| `com.powerschool.core.cc.one_roster_extractor_enrollments_for_school` | OneRoster Support for GET Enrollments for a school |

## `codeset`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.codeset.change_validaton.action` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.assessment` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.assetformat` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.assetitemcondition` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.assetitemdisposition` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.assettrackingtypes` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.bloodglucoselevel` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.concern` | Count of health concern and medication records using the submitted concern codesetid |
| `com.powerschool.core.codeset.change_validaton.diabetespump` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.dosestat` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.entryCode` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.exitCode` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.gender` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.group` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.healthmonitorstatus` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.healthplanstatus` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.highlowtreatment` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.insurance` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.intervention` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.inventoryactions` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.medicaid` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.medication` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.medicationcategory` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.medicationfrequency` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.monitoring` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.need` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.outcome` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.part` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.procedure` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.reason` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.referrer` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.route` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.screener` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.setting` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.treatment` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.unit` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.urineketones` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.change_validaton.visittype` | Count of records using the submitted codesetid |
| `com.powerschool.core.codeset.codesets_by_types` | Codeset: List Values by codeset types |

## `codesetReportedValueOpts`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.codesetReportedValueOpts.by_codeset_id` | Codeset Reported Values: List Values by codeset types |

## `commentbank`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.commentbank` | Comment Bank |

## `consecutive_absence_counts_by_school`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.consecutive_absence_counts_by_school` | Consecutive absence counts |

## `consecutive_absence_detail_by_school`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.consecutive_absence_detail_by_school` | Consecutive absence records |

## `contact`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.contact.enrollment_potentialcontact_custommatch` | Contacts: Demographic Data |
| `com.powerschool.core.contact.enrollment_potentialcontact_extendedcustommatch` | Contacts: Demographic Data |
| `com.powerschool.core.contact.pcas_account_token` | Contacts: Pcas Account Token |

## `contacts`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.contacts.student_original_contact_types` | com.pearson.core.contacts.student_original_contact_types |
| `com.powerschool.core.contacts.contact_search` | com.powerschool.core.contacts.contact_search |
| `com.powerschool.core.contacts.contact_search2` | com.powerschool.core.contacts.contact_search2 |
| `com.powerschool.core.contacts.contact_without_psim_search` | com.powerschool.core.contacts.contact_without_psim_search |
| `com.powerschool.core.contacts.global_search_contacts` | com.powerschool.core.contacts.global_search_contacts |
| `com.powerschool.core.contacts.student_contacts` | Student: Legacy Contacts |
| `com.powerschool.core.contacts.sync.school_messenger` | School Messenger Contact Sync |

## `coursegroups`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.coursegroups.names_for_all_schools` | Gets the course group names for all schools |

## `courses`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.courses.active_courses_by_teacher_exclusions` | Courses: Active Courses available for a Teacher |
| `com.pearson.core.courses.count_course_sections_assigned_to_teacher` | Course Sections: Count of Course Sections assigned to a Teacher |
| `com.pearson.core.courses.courses_by_teachers_and_term` | Courses: Active Courses available for a Teacher |
| `com.pearson.core.courses.role_properties` | Role Properties: Retrieve properties for each role definition |
| `com.powerschool.core.courses.one_roster_extractor_courses` | OneRoster Support for GET Courses |
| `com.powerschool.core.courses.one_roster_extractor_courses_for_school` | OneRoster Support for GET Courses |

## `customization`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.customization.get_assetcontent_and_history_content` | System: Get the AssetContent and AssetContentHistory Content |
| `com.powerschool.core.customization.get_assetcontent_and_history_metadata` | System: Get the AssetContent and AssetContentHistory Metadata |

## `dats`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.dats.students.attendance_daily_by_date_range` | DAT - Student Daily Attendance by Date Range |
| `com.powerschool.core.dats.students.attendance_meeting_by_date_range` | DAT - Student Meeting Attendance by Date Range |
| `com.powerschool.core.dats.students.globalid` | DAT - Student GlobalID |
| `com.powerschool.core.dats.students.health_concern_codes` | DAT - Health Concern Codes |
| `com.powerschool.core.dats.students.health_concern_table` | DAT - Health Concern Fields |
| `com.powerschool.core.dats.students.health_concerns` | DAT - Health Concerns |
| `com.powerschool.core.dats.students.late_assignment_counts_year` | DAT - Late Assignments - Year |
| `com.powerschool.core.dats.students.missing_assignment_counts_year` | DAT - Missing Assignments - Year |
| `com.powerschool.core.dats.students.racecodes` | DAT - Student Race Codes |
| `com.powerschool.core.dats.students.student_email` | DAT - Student Email |
| `com.powerschool.core.dats.teachers.adminglobalid` | DAT - Admin GlobalID |
| `com.powerschool.core.dats.teachers.racecodes` | DAT - Teacher Race Codes |
| `com.powerschool.core.dats.teachers.teacherglobalid` | DAT - Teacher GlobalID |

## `demographics`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.common.demographics.student_demographics` | Demographics data |

## `detail_grade_history`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.mfe.detail_grade_history.grade_history` | Get Grade History |

## `district`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.district.districtGradeLevels` | District: District Grade Levels |

## `document_attachment`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.document_attachment.get_student_space` | Document Attachment: Get Student Quotas |

## `documents`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.documents.get_readreceipts` | Read receipts filtered |
| `com.powerschool.core.documents.get_readreceipts_for_healthplans` | Read receipts for healthplans |

## `enterprisereporting`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.enterprisereporting.category` | Enterprise Reporting: List of Enterprise Report Category |
| `com.powerschool.core.enterprisereporting.interactive_report_page_definition` | Enterprise Reporting: List of PowerSchool Interactive Reports |

## `fee`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.fee.student_fees` | Fee: List of student fee records |

## `gender_pronouns`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.gender_pronouns` | List additional gender pronouns |

## `gradescaleitem`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.gradescaleitem.one_roster_extractor_scoreScales` | OneRoster Support for GET All Score Scales |

## `graduation_planner`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.graduation_planner.get_test_and_score_names` | GPScoreConfig unique testscoreDcids |
| `com.pearson.core.graduation_planner.gpversion_root_node` | Graduation Planner: Root node based on version |
| `com.pearson.core.graduation_planner.nodes_by_version_and_type` | GPNode |
| `com.pearson.core.graduation_planner.scoreconfig_by_version` | GPScoreConfig |
| `com.powerschool.core.graduation_planner.student_test_waiver` | Graduation Planner: List of student test waivers. |
| `com.powerschool.core.graduation_planner.student_waiver` | Graduation Planner: List of student waivers. |
| `com.powerschool.core.graduation_planner.student_waiver_with_config` | Graduation Planner: List of student waivers with configuration information. |
| `com.powerschool.core.graduation_planner.test_config` | Graduation Planner: List of graduation planner test configurations. |
| `com.powerschool.core.graduation_planner.test_configs` | Graduation Planner: List of graduation planner test and test scores configurations. |
| `com.powerschool.core.graduation_planner.testscore_config` | Graduation Planner: List of graduation planner test score configurations. |
| `com.powerschool.core.graduation_planner.waiver_config` | Graduation Planner: List of graduation planner configurations. |

## `guardian`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.guardian.guardian_students_with_plugin_restrictions` | Guardian: Student Guardian Plugin Restrictions |
| `com.pearson.core.guardian.student_guardian_detail` | Guardian: Student Guardian Detail |

## `health`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.health.get_health_screening_health_office_visit` | Health: Get Student Health Office Visit Screening |
| `com.powerschool.core.health.get_health_screening_hearing` | Health: Get Student Hearing Screening |
| `com.powerschool.core.health.get_health_screening_lead` | Health: Get Student Lead Screening |
| `com.powerschool.core.health.get_health_screening_lookup` | Health: Get Health Screen Lookup by codetype |
| `com.powerschool.core.health.get_health_screening_oral` | Health: Get Student Oral Screening |
| `com.powerschool.core.health.get_health_screening_scolio` | Health: Get Student Scolio Screening |
| `com.powerschool.core.health.get_health_screening_system` | Health: Get Student System Review Screening |
| `com.powerschool.core.health.get_health_screening_tb` | Health: Get Student TB Screening |
| `com.powerschool.core.health.get_health_screening_vision` | Health: Get Student Vision Screening |
| `com.powerschool.core.health.get_health_screening_vital` | Health: Get Student Vital Screening |
| `com.powerschool.core.health.get_health_screeningwaiver` | Health: Get Student Screening Waivers |
| `com.powerschool.core.health.get_health_vaccine_cvx_codes` | Health: Get Health Immunizations Vaccine CVX Codes |
| `com.powerschool.core.health.get_medication_admin_schedule_time_count` | Health: Get Student Medication Schedule Time count |
| `com.powerschool.core.health.get_powerpack_migration_counts` | Health: Get PowerPack migration record counts |
| `com.powerschool.core.health.get_powerpack_migration_issues` | Health: Get PowerPack migration records with issues |
| `com.powerschool.core.health.get_powerpack_plugin_status` | Health: PowerPack plugin activated |
| `com.powerschool.core.health.get_staff_list` | Health: Get list of Active Staff Members |
| `com.powerschool.core.health.get_student_change_reason_log` | Health: Get Student Change Reason Log |
| `com.powerschool.core.health.get_student_change_reason_log_screen` | Health: Get Student Change Reason Log Screening |
| `com.powerschool.core.health.get_student_contactlog` | Health: Get Student Health Contact Log |
| `com.powerschool.core.health.get_student_daily_log` | Health: Get Health Daily Log |
| `com.powerschool.core.health.get_student_doses` | Health: Get Student Medication Doses |
| `com.powerschool.core.health.get_student_health_concerns_for_alert` | Health: Get Student Health Concerns for alerts |
| `com.powerschool.core.health.get_student_health_plans` | Health: Get Student Health Plans |
| `com.powerschool.core.health.get_student_health_plans_for_alert` | Health: Get Student Health Plans for alerts |
| `com.powerschool.core.health.get_student_healthconcerns` | Health: Get Student Health Concerns |
| `com.powerschool.core.health.get_student_immunizations_change_reason_log` | Health: Get Student Change Reason Log |
| `com.powerschool.core.health.get_student_inventory` | Health: Get Student Medication Inventory |
| `com.powerschool.core.health.get_student_inventory_sum` | Health: Get Student Medication Inventory Sum, with dosages reflected. |
| `com.powerschool.core.health.get_student_medication` | Health: Get Student Medication Information |
| `com.powerschool.core.health.get_student_medications` | Health: Get Student Medications |
| `com.powerschool.core.health.get_student_misc` | Health: Get Student Misc and Insurance Data |
| `com.powerschool.core.health.get_student_pe_excuse_waiver_log` | Health: Get Student PE Excuse / Waiver log. |
| `com.powerschool.core.health.get_student_pe_excuse_waiver_logs_for_section` | Health: Get Student PE Excuse / Waivers for a section. |
| `com.powerschool.core.health.get_student_physicals` | Health: Get Student Physicals |
| `com.powerschool.core.health.health_nurse_daily_log` | Health: Get Health Daily Log |
| `com.powerschool.core.health.immunizations_certificate_type` | Immunizations: Certificate types |
| `com.powerschool.core.health.immunizations_exempt_type` | Immunizations: Exempt types |
| `com.powerschool.core.health.inventoryaction_exists` | Health: Inventory action exists |
| `com.powerschool.core.health.student_catheters_monitoring` | Monitoring:List of data for Catheters Monitoring |
| `com.powerschool.core.health.student_diabetes_monitoring` | Monitoring:List of data for monitoring |
| `com.powerschool.core.health.student_immunizations_compliancy` | Immunizations: Student Vaccine Compliance |
| `com.powerschool.core.health.student_immunizations_compliancy_all` | Immunizations: Compliance with All Immunizations |
| `com.powerschool.core.health.student_immunizations_compliancy_counts` | Immunizations: Compliancy Counts |
| `com.powerschool.core.health.student_immunizations_exempt` | Immunizations: Student Vaccine Exempt |
| `com.powerschool.core.health.student_immunizations_exemption_counts` | Immunizations: Exemption Counts |
| `com.powerschool.core.health.student_immunizations_exemptions` | Immunizations: Exemptions |
| `com.powerschool.core.health.student_immunizations_exemptions_with_vaccine_list` | Immunizations: Exemptions with Vaccine List |
| `com.powerschool.core.health.student_immunizations_not_recorded` | Immunizations: Student Vaccine Not Recorded |
| `com.powerschool.core.health.student_immunizations_not_recorded_any` | Immunizations: Not Recorded |
| `com.powerschool.core.health.student_immunizations_not_recorded_counts` | Immunizations: Not Recorded Counts |
| `com.powerschool.core.health.student_immunizations_out_of_compliance` | Immunizations: Out of Compliance |
| `com.powerschool.core.health.student_immunizations_out_of_compliance_with_vaccine_list` | Immunizations: Out of Compliance with Vaccine List |
| `com.powerschool.core.health.student_screenings_hearing_completed` | Screenings: Completed Hearing Screening |
| `com.powerschool.core.health.student_screenings_hearing_completed_with_outcome_list` | Screenings: Completed Hearing Screening with Outcome List |
| `com.powerschool.core.health.student_screenings_hearing_notcompleted` | Screenings : Not Completed Hearing Screening |
| `com.powerschool.core.health.student_screenings_lead_completed` | Screenings: Completed Lead Screening |
| `com.powerschool.core.health.student_screenings_lead_completed_with_outcome_list` | Screenings: Completed Lead Screening with Outcome List |
| `com.powerschool.core.health.student_screenings_lead_notcompleted` | Screenings : Not Completed Lead Screening |
| `com.powerschool.core.health.student_screenings_oral_completed` | Screenings: Completed Oral Screening |
| `com.powerschool.core.health.student_screenings_oral_completed_with_outcome_list` | Screenings: Completed Oral Screening with Outcome List |
| `com.powerschool.core.health.student_screenings_oral_notcompleted` | Screenings : Not Completed Oral Screening |
| `com.powerschool.core.health.student_screenings_scoliosis_completed` | Students: Completed Scoliosis Screening |
| `com.powerschool.core.health.student_screenings_scoliosis_completed_with_outcome_list` | Screenings: Completed Scoliosis Screening with Outcome List |
| `com.powerschool.core.health.student_screenings_scoliosis_notcompleted` | Screenings : Not Completed Scoliosis Screening |
| `com.powerschool.core.health.student_screenings_system_completed` | Screenings: Completed System Review Screening |
| `com.powerschool.core.health.student_screenings_system_completed_with_outcome_list` | Screenings: Completed System Review Screening with Outcome List |
| `com.powerschool.core.health.student_screenings_system_notcompleted` | Screenings : Not Completed System Review Screening |
| `com.powerschool.core.health.student_screenings_tuberculosis_completed` | Screenings: Completed Tuberculosis Screening |
| `com.powerschool.core.health.student_screenings_tuberculosis_completed_with_outcome_list` | Screenings: Completed Tuberculosis Screening with Outcome List |
| `com.powerschool.core.health.student_screenings_tuberculosis_notcompleted` | Screenings : Not Recorded Tuberculosis Screening |
| `com.powerschool.core.health.student_screenings_vision_completed` | Screenings: Completed Vision and Color Screening |
| `com.powerschool.core.health.student_screenings_vision_completed_with_outcome_list` | Screenings: Completed Vision and Color Screening with Outcome List |
| `com.powerschool.core.health.student_screenings_vision_notcompleted` | Screenings : Not Completed Vision and Color Screening |
| `com.powerschool.core.health.student_screenings_vitalsigns_completed` | Screenings: Completed Vital Signs and Biometrics Screening |
| `com.powerschool.core.health.student_screenings_vitalsigns_completed_with_outcome_list` | Screenings: Completed Vital Signs and Biometrics Screening with Outcome List |
| `com.powerschool.core.health.student_screenings_vitalsigns_notcompleted` | Screenings : Not Completed Vital Signs and Biometrics Screening |
| `com.powerschool.core.health.student_tubefeedings_monitoring` | Tube Feedings Monitoring:List of data for tube feedings monitoring |

## `incident`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.incident.code_and_subcode_type` | Incident: List of Codes and Subcodes |
| `com.pearson.core.incident.code_type` | Incident: List of Code Categories |
| `com.pearson.core.incident.codetype_incidenttypecode` | Incident: List of Codes and Subcodes for incidenttypecode |
| `com.pearson.core.incident.count_code_type` | Incident: List of Incident Counts |
| `com.pearson.core.incident.count_sub_code_type` | Incident: List of Incident Counts |
| `com.pearson.core.incident.incident_count_by_month` | Incident: List of Incident Counts by Month |
| `com.pearson.core.incident.incident_list` | Incident: List of Incidents |
| `com.pearson.core.incident.incident_template` | IncidentTemplate:List of Incident Templates |

## `medication`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.mfe.medication.medication` | Get Medication |
| `com.powerschool.mfe.medication.medication_detail` | Get Student Medication Detail |

## `mobile-app-shell-bff`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.mfe.mobile-app-shell-bff.disabled_features` | com.powerschool.mfe.mobile-app-shell-bff.disabled_features |
| `com.powerschool.mfe.mobile-app-shell-bff.guardianstudents` | com.powerschool.mfe.mobile-app-shell-bff.guardianstudents |

## `notifications`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.notifications.search_notification_categories` | Notification Category: List of notification categories |

## `page_permissions`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.page_permissions.security_group` | Page Permissions: Get info for security group |

## `performance`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.student.performance.evaluation_counts` | Evaluations: Evaluation Factor Counts |
| `com.powerschool.student.performance.evaluation_index_factor` | Evaluations: Students Evaluation Factor |
| `com.powerschool.student.performance.evaluation_index_level` | Evaluations: Students Evaluation levels |
| `com.powerschool.student.performance.evaluation_index_method` | Evaluations: Students Evaluation method |
| `com.powerschool.student.performance.evaluation_school_config` | Evaluations: Students Evaluation School Config |

## `person`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.person.one_roster_extractor_users` | OneRoster Support for GET Users |

## `plugin`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.plugin.asset_content_by_plugin_id_type` | Plugin: Asset Content by Plugin ID Type |
| `com.pearson.core.plugin.asset_metadata_by_plugin_id_type` | Plugin: Asset Metadata by Plugin ID Type |
| `com.pearson.core.plugin.extendedSchemaDefByPlugin` | Plugin: Extended Schema Definition by Plugin |
| `com.pearson.core.plugin.extendedSchemaFieldsByTable` | Plugin: Extended Schema Fields by Table |
| `com.pearson.core.plugin.extendedSchemaForeignKeysByTable` | Plugin: Extended Schema Foreign Keys by Table |
| `com.pearson.core.plugin.extendedSchemaIndexesByTable` | Plugin: Extended Schema Indexes by Table |
| `com.pearson.core.plugin.extendedSchemaTablesByExtension` | Plugin: Extended Schema Tables by Extension |
| `com.pearson.core.plugin.plugin_metadata` | Plugin: Plugin Metadata |
| `com.pearson.core.plugin.plugins_with_assets` | Plugin: Plugin with Assets |
| `com.pearson.core.plugin.samlip.authentication` | Plugin: SAML Identity Provider |
| `com.pearson.core.plugin.samlsp.authentication` | Plugin: SAML Service Provider |

## `roledef`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.roledef.roles` | Roles: Get list of Roles |
| `com.powerschool.core.roledef.useraccessroles` | Roles: Get list of localized enabled Roles |

## `scheduledevent`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.scheduledevent.get_scheduled_events` | Schedule:List of data for scheduled Events |

## `scheduling`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.scheduling.power_schedule_current_year` | PowerScheduler Schedule Year |
| `com.powerschool.core.scheduling.power_schedule_periods` | Powerscheduler: scheduled periods |
| `com.powerschool.core.scheduling.power_schedule_student_schedules` | Student: scheduled course in PowerScheduler |
| `com.powerschool.core.scheduling.power_schedule_year_terms` | PowerScheduler Terms: Year Terms |
| `com.powerschool.core.scheduling.studentUnscheduledPeriods` | Student: Unscheduled Periods |

## `school`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.school.activeCourses` | School: Active Courses |
| `com.pearson.core.school.courses` | School: Courses |
| `com.pearson.core.school.invalidFutureScheduleRequests` | ScheduleRequests: Invalid Schedule Requests |
| `com.pearson.core.school.scheduleCourses` | School: Schedule Courses |
| `com.pearson.core.school.school_detail` | School: School Detail |
| `com.powerschool.core.school.activeCoursesByYear` | School: Active Courses By Year |
| `com.powerschool.core.school.period` | Student: scheduled course |
| `com.powerschool.core.school.scheduleCourseCatalog` | School: Schedule Course Catalog |
| `com.powerschool.unified.school.school_information` | School: Get school information |

## `schools`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.schools.grade_levels` | Incident: List of Grade Levels |
| `com.pearson.core.schools.scheduling_grade_levels` | Scheduling grade levels |
| `com.pearson.core.schools.school_course_sections` | Sections: List of Sections |
| `com.pearson.core.schools.school_list` | Schools: List of Schools |
| `com.pearson.core.schools.school_list_with_att_recalc_prefs` | Schools: List of Schools with Attendance Recalculation Status |
| `com.pearson.core.schools.school_search_for_admin_user` | Optionally Filtered List of Schools Admin User Can Access |
| `com.pearson.core.schools.sectionreadiness` | Section Readiness: List of Sections with readiness verified |
| `com.powerschool.core.schools.all_schools` | Schools: List of Schools |
| `com.powerschool.core.schools.one_roster_extractor_orgs` | OneRoster Support for GET Organization |
| `com.powerschool.core.schools.one_roster_extractor_schools` | OneRoster Support for GET Schools |

## `sections`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.sections.one_roster_extractor_classes` | OneRoster Support for GET Classes |
| `com.powerschool.core.sections.one_roster_extractor_classes_for_teacher` | OneRoster Support for GET Classes |

## `signed`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.signed.plugin_metadata` | Signed Plugin: Plugin Metadata |

## `staff`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.staff.search.find_staff` | Staff: List of Staff |
| `com.powerschool.core.staff.custom_notifications.search_admin_users` | Staff: List of Staff for Custom Notification recipient selection |
| `com.powerschool.core.staff.global_search_staff` | Staff: List of Staff for Global Search |
| `com.powerschool.core.staff.securitygroups` | Staff: Security Groups |
| `com.powerschool.core.staff.stafftype` | Staff Types: list of valid Staff Types |
| `com.powerschool.core.staff.sync.school_messenger` | School Messenger Staff Sync |
| `com.powerschool.core.staff.user_tasks.search_staff` | Staff: List of Staff |

## `student`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.student.health.immunizations` | Student: Immunizations |
| `com.pearson.core.student.health.office_visits` | Student: Office Visits |
| `com.pearson.core.student.infosnap_student_data` | Students: Demographic Data |
| `com.pearson.core.student.search.find_students` | Attendance: Find Student |
| `com.pearson.core.student.search.find_students_with_remote_enrollment` | Find Student with remote enrollment |
| `com.pearson.core.student.search.get_student_basic_info` | Students: Basic data |
| `com.pearson.core.student.student_course_data` | Student: Course Data |
| `com.pearson.core.student.student_dcid_id_map` | Student: Student DCID ID Map |
| `com.powerschool.core.student.demographic_student_data` | Students: Demographic Data |
| `com.powerschool.core.student.enrollment_exactstudent_custommatch` | Students: Demographic Data |
| `com.powerschool.core.student.enrollment_potentialstudent_custommatch` | Students: Demographic Data |
| `com.powerschool.core.student.entry_codes` | Enrollment entry codes |
| `com.powerschool.core.student.ftes` | FTE: FTE records for the given school and year |
| `com.powerschool.core.student.global_search_pre-reg_students` | com.powerschool.core.student.global_search_pre-reg_students |
| `com.powerschool.core.student.global_search_students` | Global Search: Find Students |
| `com.powerschool.core.student.scheduleCourse` | Student: scheduled course |
| `com.powerschool.core.student.standardized_test_names` | Standardized Tests Data |
| `com.powerschool.core.student.student_fitness_test_score_data` | Student: Fitness Test Scores Data |
| `com.powerschool.core.student.student_standard_grades_data` | Student: Standard Grades Data |
| `com.powerschool.core.student.student_test_results_data` | Student: Test Results Data |
| `com.powerschool.core.student.student_test_scores_data` | Student: Test Scores Data |
| `com.powerschool.core.student.test_scores` | Test Scores |
| `com.powerschool.core.student.test_scores_by_id` | Test Scores by student test id |
| `com.powerschool.unified.student.absence_summary` | Students: Get student absence summary |
| `com.powerschool.unified.student.schedule_and_attendance` | Students: Get student schedule and attendance information |
| `com.powerschool.unified.student.student_information` | Students: Get student information |

## `student_school_enrollment_check`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.student_school_enrollment_check` | Student is Enrolled |

## `students`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.students.one_roster_extractor_students` | OneRoster Support for GET Students |
| `com.powerschool.core.students.one_roster_extractor_students_for_class` | OneRoster Support for GET Students for given Class |
| `com.powerschool.core.students.one_roster_extractor_students_for_class_in_school` | OneRoster Support for GET Students |
| `com.powerschool.core.students.one_roster_extractor_students_for_school` | OneRoster Support for GET Students for given School |

## `summer_school_enrollment`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.summer_school_enrollment` | Students: Summer School Enrollment Data |

## `teacherCategory`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.teacherCategory.one_roster_extractor_categories` | OneRoster Support for GET Categories |

## `teachers`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.teachers.sectionEnrollments` | Teachers: Section Enrollments |
| `com.pearson.core.teachers.term_schedule` | Teachers: Term Schedule |
| `com.pearson.core.teachers.term_sections` | Teachers: Term Sections |

## `templatemanagement`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.templatemanagement.healthplantemplate` | Template:List of Enabled Templates |
| `com.pearson.core.templatemanagement.template` | Template:List of Templates |

## `termbins`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.termbins.storecodes` | Termbins: Reporting terms storecode |
| `com.powerschool.core.termbins.addedgradescales_for_district_push` | Termbins: Grade Scales for Reporting terms |
| `com.powerschool.core.termbins.getGradeScaleItems_for_district_push` | Termbins: Grade Scales for Reporting terms |
| `com.powerschool.core.termbins.gradescales_for_district_push` | Termbins: Grade Scales for Reporting terms |
| `com.powerschool.core.termbins.one_roster_extractor_grading_periods` | OneRoster Support for GET Grading Periods |
| `com.powerschool.core.termbins.presume_completion_no_of_days_district_push` | Termbins: Reporting terms storecode |
| `com.powerschool.core.termbins.show_assignment_letter_percent_info` | Termbins: Reporting terms storecode |
| `com.powerschool.core.termbins.storecodes_for_district_push` | Termbins: Reporting terms storecode |

## `terms`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.terms.daterange` | Terms: Year Date Range |
| `com.pearson.core.terms.relatedTerms` | Terms: Related Terms |
| `com.pearson.core.terms.school_terms` | Terms: School Terms |
| `com.pearson.core.terms.schoolyears` | Terms: School Year Date Ranges |
| `com.pearson.core.terms.term_from_school` | Terms: School Term |
| `com.pearson.core.terms.term_from_student` | Terms: School Term |
| `com.pearson.core.terms.terms_for_school` | Terms: School Terms |
| `com.pearson.core.terms.terms_for_student` | Terms: Student Terms |
| `com.pearson.core.terms.year_terms` | Terms: Year Terms |
| `com.pearson.core.terms.yearid` | Terms: YearId |
| `com.powerschool.core.terms.one_roster_extractor_academic_sessions` | OneRoster Support for GET Academic Sessions |
| `com.powerschool.core.terms.one_roster_extractor_academic_sessions_for_school` | OneRoster Support for GET Academic Sessions for Schools |
| `com.powerschool.core.terms.one_roster_extractor_terms` | OneRoster Support for GET Terms |
| `com.powerschool.core.terms.one_roster_extractor_terms_for_school` | OneRoster Support for GET Terms For A Particular School |

## `test`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.test.test_list` | Test: Tests |
| `com.pearson.core.test.tests_list` | Test: Tests which defined test scores |

## `testscore`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.testscore.testscore_list` | Test Scores: Test Scores |

## `users`

| PowerQuery | 摘要 |
| --- | --- |
| `com.pearson.core.users.active_users` | Users: Active Users for a School |
| `com.pearson.core.users.unassign_psim_identifiers` | Users: Active Users for a School |
| `com.powerschool.core.users.access_roles` | Users: Access Roles |
| `com.powerschool.core.users.admin_access_roles` | Users: Admin access and roles. |
| `com.powerschool.core.users.coteacher_access_roles` | Users: CoTeacher Access Roles |
| `com.powerschool.core.users.one_roster_extractor_teachers` | OneRoster Support for GET Teachers |
| `com.powerschool.core.users.one_roster_extractor_teachers_for_class` | OneRoster Support for GET Teachers for Classes |
| `com.powerschool.core.users.one_roster_extractor_teachers_for_class_in_school` | OneRoster Support for GET Teachers for class in a school |
| `com.powerschool.core.users.one_roster_extractor_teachers_for_school` | OneRoster Support for GET Teachers For A Particular School |

## `workflow`

| PowerQuery | 摘要 |
| --- | --- |
| `com.powerschool.core.workflow.workflow_definitions` | Workflow: Definitions |
