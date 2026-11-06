# PowerSchool SIS API 端点目录（自动生成）

> 来源：PowerSchool Developer Portal → Core Resources 的 Swagger 2.0 规范（`/webservices/developer/media/file/177`）。
> 抓取日期：2026-11-06。总计 **303** 个路径 / **409** 个操作。

本目录只列出路径、方法和摘要，作为检索索引。参数、请求体、响应结构请以门户 Swagger 与各资源页面为准；插件中最常用的 v1 资源在 [03-core-endpoints.md](../01-api/03-core-endpoints.md) 中有详细说明。

## 分组概览

| 分组 | 操作数 |
| --- | --- |
| `/ws/xte` | 117 |
| `/ws/district` | 51 |
| `/ws/contacts` | 37 |
| `/ws/students` | 36 |
| `/ws/schema` | 26 |
| `/ws/v1` | 21 |
| `/ws/workflow` | 18 |
| `/ws/evaluations` | 13 |
| `/ws/customnotification` | 11 |
| `/ws/gradplanner` | 11 |
| `/ws/attendance` | 8 |
| `/ws/er` | 6 |
| `/ws/health` | 6 |
| `/ws/notificationviewer` | 6 |
| `/ws/districtcategory` | 5 |
| `/ws/scheduledevent` | 5 |
| `/ws/asset` | 4 |
| `/ws/assetinv` | 4 |
| `/ws/assetcourseassoc` | 3 |
| `/ws/assetinvowner` | 3 |
| `/ws/schedulecourserequest` | 3 |
| `/ws/school` | 3 |
| `/ws/export` | 2 |
| `/ws/report` | 2 |
| `/ws/studentcounselor` | 2 |
| `/ws/calendar` | 1 |
| `/ws/datavalidation` | 1 |
| `/ws/dataversion` | 1 |
| `/ws/incident` | 1 |
| `/ws/role` | 1 |
| `/ws/signed` | 1 |

## `/ws/asset` — 资产 Asset

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/asset` | Creates an asset |
| DELETE | `/ws/asset/{id}` | Deletes an Asset |
| GET | `/ws/asset/{id}` | Gets an asset by ID |
| PUT | `/ws/asset/{id}` | Updates an asset |

## `/ws/assetcourseassoc` — 资产-课程关联

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/ws/assetcourseassoc/asset_courses_map` | Get the asset-course associations map by asset ids and filtered by course dcids |
| POST | `/ws/assetcourseassoc/associate_courses` | Create/Delete bulk assetcourseassoc records |
| GET | `/ws/assetcourseassoc/{assetCourseAssocId}` | Get an assetcourseassoc by ID |

## `/ws/assetinv` — 资产库存 Asset Inventory

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/assetinv/mass_create_inv` | Create bulk assetinv records |
| DELETE | `/ws/assetinv/{assetInvId}` | Deletes an asset inventory by id |
| GET | `/ws/assetinv/{assetInvId}` | Get an assetinv by ID |
| PUT | `/ws/assetinv/{assetInvId}` | Update an assetinv |

## `/ws/assetinvowner` — 资产库存归属

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/assetinvowner` | Create a assetinvowner |
| GET | `/ws/assetinvowner/{assetInvOwnerId}` | Get a assetinvowner by ID |
| PUT | `/ws/assetinvowner/{assetInvOwnerId}` | Update a assetinvowner |

## `/ws/attendance` — 考勤

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/attendance/batch_daily_time` | Create or update daily or time attendance record in batches |
| POST | `/ws/attendance/daily` | Records daily attendance entries. |
| POST | `/ws/attendance/daily/time` | Records daily attendance time entries. |
| GET | `/ws/attendance/daily/timeConstraint` | Returns the start and end times of the date. |
| POST | `/ws/attendance/daily_time` | Create or update daily or time attendance record |
| POST | `/ws/attendance/meeting/time/recalculation` | Recalculate clock in/clock out minutes. |
| POST | `/ws/attendance/meeting_interval` | Create or update meeting or interval attendance record |
| POST | `/ws/attendance/time` | Records attendance time entries. |

## `/ws/calendar` — 其他

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/calendar/autocalendar` | Automated calendar setup for district and schools |

## `/ws/contacts` — 联系人（Student Contacts）

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/contacts/contact` | Insert a new contact. |
| GET | `/ws/contacts/contact/{contactId}` | Get contact by contactid. |
| GET | `/ws/contacts/contacts` | Get contacts by contactIds. |
| GET | `/ws/contacts/guardian/{guardianid}` | Get a contact by related guardian ID. |
| GET | `/ws/contacts/restrictable` | Get plugins that are restrictable |
| GET | `/ws/contacts/student/original_contact_types/in_use/{studentdcid}` | Gets a list of each of the six original contact types that are already in use for the specified stud… |
| GET | `/ws/contacts/student/{studentdcid}` | Get student contacts by studentDcid. |
| DELETE | `/ws/contacts/{contactId}` | Delete a contact |
| POST | `/ws/contacts/{contactId}` | Update a contact and its associated information by its contactId. |
| GET | `/ws/contacts/{contactid}/addresses` | Get contact addresses by contactid. |
| POST | `/ws/contacts/{contactid}/addresses` | Insert a new contact address. |
| DELETE | `/ws/contacts/{contactid}/addresses/{contactaddressid}` | Delete a contact address. |
| GET | `/ws/contacts/{contactid}/addresses/{contactaddressid}` | Get contact address by contactid and contactaddressid. |
| PUT | `/ws/contacts/{contactid}/addresses/{contactaddressid}` | Update a contact address |
| GET | `/ws/contacts/{contactid}/demographics` | Gets top level contact information. Contact child elements will not be included in the response. |
| PUT | `/ws/contacts/{contactid}/demographics` | Updates top level contact information. Contact child elements will be not be updated. |
| GET | `/ws/contacts/{contactid}/emails` | Get contact emails by contactid. |
| POST | `/ws/contacts/{contactid}/emails` | Insert a new contact email |
| DELETE | `/ws/contacts/{contactid}/emails/{contactemailid}` | Delete a contact email address. |
| GET | `/ws/contacts/{contactid}/emails/{contactemailid}` | Get contact email by contactid and contactemailid. |
| PUT | `/ws/contacts/{contactid}/emails/{contactemailid}` | Update a contact email. |
| GET | `/ws/contacts/{contactid}/phones` | Gets a list of all phone numbers for a contact. |
| POST | `/ws/contacts/{contactid}/phones` | Add a phone number to a contact. |
| DELETE | `/ws/contacts/{contactid}/phones/{contactphoneid}` | Deletes a single contact phone number. |
| GET | `/ws/contacts/{contactid}/phones/{contactphoneid}` | Gets a single contact phone number. |
| PUT | `/ws/contacts/{contactid}/phones/{contactphoneid}` | Update a student phone number. |
| GET | `/ws/contacts/{contactid}/students` | Gets a list of all contact student associations for a contact. |
| POST | `/ws/contacts/{contactid}/students` | Add a student to a contact. Student contact details can be included but must not contain overlapping… |
| DELETE | `/ws/contacts/{contactid}/students/{contactstudentid}` | Deletes a single contact student associations for a contact. |
| GET | `/ws/contacts/{contactid}/students/{contactstudentid}` | Gets a single contact student association for a contact. |
| PUT | `/ws/contacts/{contactid}/students/{contactstudentid}` | Update a student contact association. Any student contact detail included in the request will be ign… |
| GET | `/ws/contacts/{contactid}/students/{contactstudentid}/studentdetails` | Gets a list of all student contact details for a student contact. |
| POST | `/ws/contacts/{contactid}/students/{contactstudentid}/studentdetails` | Add a student contact detail record to an existing student contact association. |
| DELETE | `/ws/contacts/{contactid}/students/{contactstudentid}/studentdetails/{contactstudentdetailid}` | Deletes a single student contact detail record. |
| GET | `/ws/contacts/{contactid}/students/{contactstudentid}/studentdetails/{contactstudentdetailid}` | Gets a single contact student detail for a student contact. |
| PUT | `/ws/contacts/{contactid}/students/{contactstudentid}/studentdetails/{contactstudentdetailid}` | Update a student contact detail. |
| GET | `/ws/contacts/{contactid}/waa` | Gets a contact's web access account. |

## `/ws/customnotification` — 自定义通知

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/ws/customnotification/applicationEvents` | Get application events for custom notifications |
| GET | `/ws/customnotification/datachange/table` | Get supported tables and fields for data change event |
| POST | `/ws/customnotification/definition` | Save notification definition |
| PUT | `/ws/customnotification/definition` | Update notification definition |
| POST | `/ws/customnotification/definition/duplicate` | Duplicate a notification definition |
| DELETE | `/ws/customnotification/definition/{notificationDefinitionId}` | Delete notification definition for the id passed |
| GET | `/ws/customnotification/definition/{notificationDefinitionId}` | Get notification definition for the id passed |
| GET | `/ws/customnotification/definitions` | Get a list of all notification definitions |
| GET | `/ws/customnotification/getNotificationFeatureStatus` | Get notification feature status |
| GET | `/ws/customnotification/notificationEntryData` | Get data for the notification entry page |
| POST | `/ws/customnotification/saveListChanges` | Save notification list changes |

## `/ws/datavalidation` — 其他

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/datavalidation/rules` | Get list of data validation rules |

## `/ws/dataversion` — 其他

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/ws/dataversion/{applicationName}/{dataVersion}` | Get IDs of changed records according to data version subscription. |

## `/ws/district` — 学区级扩展接口

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/district/careertech/cluster` | Create a new cluster. |
| POST | `/ws/district/careertech/cluster/type` | Create a new cluster type. |
| DELETE | `/ws/district/careertech/cluster/type/{careerTechClusterTypeId}` | Delete a cluster type. |
| PUT | `/ws/district/careertech/cluster/type/{careerTechClusterTypeId}` | Update a cluster type. |
| DELETE | `/ws/district/careertech/cluster/{careerTechClusterId}` | Delete a cluster. |
| PUT | `/ws/district/careertech/cluster/{careerTechClusterId}` | Update a cluster. |
| POST | `/ws/district/careertech/credential` | Create a new credential. |
| POST | `/ws/district/careertech/credential/type` | Create a new credential type. |
| DELETE | `/ws/district/careertech/credential/type/{careerTechCredentialTypeId}` | Delete a credential type. |
| PUT | `/ws/district/careertech/credential/type/{careerTechCredentialTypeId}` | Update a credential type. |
| DELETE | `/ws/district/careertech/credential/{careerTechCredentialId}` | Delete a credential. |
| PUT | `/ws/district/careertech/credential/{careerTechCredentialId}` | Update a credential. |
| POST | `/ws/district/careertech/locality` | Create a new locality. |
| DELETE | `/ws/district/careertech/locality/{careerTechLocalityId}` | Delete a locality. |
| PUT | `/ws/district/careertech/locality/{careerTechLocalityId}` | Update a locality. |
| POST | `/ws/district/careertech/program` | Create a new program. |
| POST | `/ws/district/careertech/program/type` | Create a new program type. |
| DELETE | `/ws/district/careertech/program/type/{careerTechProgramTypeId}` | Delete a program type. |
| PUT | `/ws/district/careertech/program/type/{careerTechProgramTypeId}` | Update a program type. |
| DELETE | `/ws/district/careertech/program/{careerTechProgramId}` | Delete a program. |
| PUT | `/ws/district/careertech/program/{careerTechProgramId}` | Update a program. |
| GET | `/ws/district/careertech/program/{careerTechProgramId}/node` | Get program nodes by program id. |
| POST | `/ws/district/careertech/program/{careerTechProgramId}/node` | Create a program node. |
| DELETE | `/ws/district/careertech/program/{careerTechProgramId}/node/{careerTechProgramNodeId}` | Delete a program node. |
| PUT | `/ws/district/careertech/program/{careerTechProgramId}/node/{careerTechProgramNodeId}` | Update a program node. |
| GET | `/ws/district/careertech/programs` | Gets all existing programs |
| PUT | `/ws/district/careertech/reimbursement/{careerTechProgramCredentialsId}` | Update a reimbursement. |
| POST | `/ws/district/careertech/site` | Create a new site. |
| POST | `/ws/district/careertech/site/mass_school` | Create multiple new school sites. |
| DELETE | `/ws/district/careertech/site/{careerTechSiteId}` | Delete a site. |
| PUT | `/ws/district/careertech/site/{careerTechSiteId}` | Update a site. |
| GET | `/ws/district/codeset` | Get a list of all codesets |
| POST | `/ws/district/codeset` | Create a codeset |
| GET | `/ws/district/codeset/codesets/{id}` | Get a list of all codes related to codeset id |
| PUT | `/ws/district/codeset/retire/{id}` | Retire a codeset |
| GET | `/ws/district/codeset/type/{codetype}` | Get a list of all codes related to codeset type |
| POST | `/ws/district/codeset/updateUiDispOrder` | Updates Ui Diplay Order of two codes |
| DELETE | `/ws/district/codeset/{id}` | Delete a codeset |
| GET | `/ws/district/codeset/{id}` | Get codeset by ID |
| PUT | `/ws/district/codeset/{id}` | Update a codeset |
| POST | `/ws/district/incidentmanagement/incidenttemplate` | Create an incident template |
| DELETE | `/ws/district/incidentmanagement/incidenttemplate/incident/{incidentTemplateIds}` | Delete incident template by Ids |
| DELETE | `/ws/district/incidentmanagement/incidenttemplate/{incidentTemplateId}` | Delete an incident template |
| GET | `/ws/district/incidentmanagement/incidenttemplate/{incidentTemplateId}` | Get an incident template by ID |
| PUT | `/ws/district/incidentmanagement/incidenttemplate/{incidentTemplateId}` | Update an incident template |
| POST | `/ws/district/templatemanagement` | Create a template |
| DELETE | `/ws/district/templatemanagement/template/{templateIds}` | Delete template by Ids |
| GET | `/ws/district/templatemanagement/template/{templateId}` | Get a template for a category by ID |
| DELETE | `/ws/district/templatemanagement/{templateId}` | Delete a template |
| GET | `/ws/district/templatemanagement/{templateId}` | Get a template by ID |
| PUT | `/ws/district/templatemanagement/{templateId}` | Update a template |

## `/ws/districtcategory` — 其他

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/ws/districtcategory` | Get all district categories |
| PUT | `/ws/districtcategory` | Save a district category |
| PUT | `/ws/districtcategory/categories` | Save district categories |
| DELETE | `/ws/districtcategory/{id}` | Delete a district category by ID |
| GET | `/ws/districtcategory/{id}` | Get district category by ID |

## `/ws/er` — ER 页面定义

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/er/pagedef` | Add Enterprise Report |
| GET | `/ws/er/pagedef/apexuser` | Get APEX User Settings |
| POST | `/ws/er/pagedef/apexusersetting` | Saves the Security Settings for Application Permissions |
| GET | `/ws/er/pagedef/category` | Get Enterprise Reports by Category |
| DELETE | `/ws/er/pagedef/{id}` | Delete Enterprise Report |
| PUT | `/ws/er/pagedef/{id}` | Edit Enterprise Report |

## `/ws/evaluations` — 评估

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/evaluations/evaluationlevel` | Creates an evaluation level. |
| DELETE | `/ws/evaluations/evaluationlevel/{levelid}` | Deletes an evaluation level by ID. |
| GET | `/ws/evaluations/evaluationlevel/{levelid}` | Gets an evaluation level by ID. |
| PUT | `/ws/evaluations/evaluationlevel/{levelid}` | Updates an evaluation level. |
| POST | `/ws/evaluations/evaluationmethod` | Create an evaluation method. |
| DELETE | `/ws/evaluations/evaluationmethod/{methodid}` | Deletes an evaluation method by ID. |
| GET | `/ws/evaluations/evaluationmethod/{methodid}` | Gets an evaluation method by ID. |
| PUT | `/ws/evaluations/evaluationmethod/{methodid}` | Updates an evaluation method. |
| POST | `/ws/evaluations/evaluationschoolconfig` | Creates an evaluation school config. |
| POST | `/ws/evaluations/evaluationschoolconfig/save` | Save a list of evaluation school config items. |
| DELETE | `/ws/evaluations/evaluationschoolconfig/{configid}` | Deletes an evaluation school config by ID. |
| GET | `/ws/evaluations/evaluationschoolconfig/{configid}` | Gets an evaluation school config by ID. |
| PUT | `/ws/evaluations/evaluationschoolconfig/{configid}` | Updates an evaluation school config. |

## `/ws/export` — 其他

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/export` | Get an export of localization |
| POST | `/ws/export/count` | Get an export of localization |

## `/ws/gradplanner` — 毕业规划

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/gradplanner/configwaiver` | Creates and Updates Graduation Planner Waiver Configuration |
| DELETE | `/ws/gradplanner/configwaiver/{configid}` | Deletes Waiver Configuration by ID |
| GET | `/ws/gradplanner/progress/{studentid}` | Get student graduation progress |
| POST | `/ws/gradplanner/reportdatacapture` | Populates graduation planner report tables with a snapshot of student graduation plan progress infor… |
| POST | `/ws/gradplanner/studenttestwaiver` | Creates and updates graduation planner student test score waiver. |
| DELETE | `/ws/gradplanner/studenttestwaiver/{waiverid}` | Deletes a Student Test Waiver |
| POST | `/ws/gradplanner/studentwaiver` | Save Student Graduation Plan Waiver |
| DELETE | `/ws/gradplanner/studentwaiver/{waiverid}` | Deletes a Student Waiver |
| POST | `/ws/gradplanner/testscoreconfig` | Creates and updates graduation planner test score configuration. |
| DELETE | `/ws/gradplanner/testscoreconfig/{configid}` | Deletes test score configuration by ID. |
| POST | `/ws/gradplanner/workflow/{gpWorkFLowIndicator}` | Saves the gradplan workflow and deletes historical data if choosen. |

## `/ws/health` — 健康

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/ws/health/screening/screeningoptions` | Get all health screening options |
| DELETE | `/ws/health/screening/{screening_type}` | Delete student screening for provided type |
| POST | `/ws/health/screening/{screening_type}` | Create a new student screening for provided type |
| PUT | `/ws/health/screening/{screening_type}` | Update student screening for provided type |
| GET | `/ws/health/screenings/activityid/{screening_type}` | get student screening for provided screening type and activityid |
| GET | `/ws/health/screenings/{screening_type}` | Get screenings of a specific type for a list of students on a particular date |

## `/ws/incident` — 事件/纪律（Incidents）

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/incident` | Create an incident |

## `/ws/notificationviewer` — 通知查看

| Method | Path | Summary |
| --- | --- | --- |
| PUT | `/ws/notificationviewer/notification` | Update admin/teacher portal notification |
| DELETE | `/ws/notificationviewer/notification/{staffNotificationId}` | Delete an admin/teacher portal notification for the user |
| GET | `/ws/notificationviewer/notifications/badgecount` | Get admin/teacher portal notification badge count for the user |
| PUT | `/ws/notificationviewer/notifications/read` | Update admin/teacher portal notifications to mark as read |
| PUT | `/ws/notificationviewer/notifications/resetbadge` | Clear admin/teacher portal notification badge count for the user |
| POST | `/ws/notificationviewer/notifications/search` | Get admin/teacher portal notifications matching the search criteria for the user |

## `/ws/report` — 其他

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/report/logins/invalid` | Get invalidLogins |
| POST | `/ws/report/logins/invalid/count` | Get invalidLoginsCount |

## `/ws/role` — 其他

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/role/available/access` | Creates Roles for the Unified Insights. |

## `/ws/schedulecourserequest` — 其他

| Method | Path | Summary |
| --- | --- | --- |
| DELETE | `/ws/schedulecourserequest` | Mass delete schedule course requests |
| PUT | `/ws/schedulecourserequest/changecourse` | Mass change the course for schedule course requests |
| PUT | `/ws/schedulecourserequest/changeschool` | Mass change school ID for schedule course requests |

## `/ws/scheduledevent` — 其他

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/scheduledevent` | Create a scheduled event |
| DELETE | `/ws/scheduledevent/delete/{id}` | Delete/Update a scheduled event record and delete all future monitoring events |
| DELETE | `/ws/scheduledevent/{id}` | Delete a scheduled event record |
| GET | `/ws/scheduledevent/{id}` | Get a scheduled event by ID |
| PUT | `/ws/scheduledevent/{id}` | Update a scheduled event |

## `/ws/schema` — Schema / Table / PowerQuery 接口

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/ws/schema/area` | Get functional areas |
| GET | `/ws/schema/area/{area}/table` | Get tables for functional area |
| GET | `/ws/schema/plugin/{id}/validate` | Get plugin validation errors |
| GET | `/ws/schema/query/api` | List all named queries |
| POST | `/ws/schema/query/{queryname}` | Execute a named query |
| POST | `/ws/schema/query/{queryname}/count` | Get row count from a named query |
| GET | `/ws/schema/table` | Get all tables in the database |
| POST | `/ws/schema/table/spenrollments` | Create a single special program enrollment |
| DELETE | `/ws/schema/table/spenrollments/{id}` | Delete a single special program enrollment by ID |
| GET | `/ws/schema/table/spenrollments/{id}` | Get a single special program enrollment record |
| PUT | `/ws/schema/table/spenrollments/{id}` | Update a single special program enrollment record |
| POST | `/ws/schema/table/storedgrades` | Create a single historical grade |
| DELETE | `/ws/schema/table/storedgrades/{id}` | Delete a single historical grade by ID |
| GET | `/ws/schema/table/storedgrades/{id}` | Get a single historical grade record |
| PUT | `/ws/schema/table/storedgrades/{id}` | Update a single special historical record |
| POST | `/ws/schema/table/transportation` | Create a single Transportation Record |
| DELETE | `/ws/schema/table/transportation/{id}` | Delete Transportation Record |
| PUT | `/ws/schema/table/transportation/{id}` | Update Transportation Record |
| GET | `/ws/schema/table/{tablename}` | Query multiple rows from a table |
| POST | `/ws/schema/table/{tablename}` | Insert a single row into a database table |
| GET | `/ws/schema/table/{tablename}/count` | Get row count from a table based on criteria |
| POST | `/ws/schema/table/{tablename}/massupdatebycriteria` | Update multiple rows in a table based on criteria |
| GET | `/ws/schema/table/{tablename}/metadata` | Get table metadata |
| DELETE | `/ws/schema/table/{tablename}/{id}` | Delete a single row from a database table |
| GET | `/ws/schema/table/{tablename}/{id}` | Get a single row from a database table |
| PUT | `/ws/schema/table/{tablename}/{id}` | Update a single row into a database table |

## `/ws/school` — 学校级扩展接口

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/school/careertech/school` | Create a new school association. |
| DELETE | `/ws/school/careertech/school/{careerTechSchoolId}` | Delete a school association. |
| PUT | `/ws/school/careertech/school/{careerTechSchoolId}` | Update a school association. |

## `/ws/signed` — 签名类接口

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/signed/incident` | Create a basic incident |

## `/ws/studentcounselor` — 学生顾问

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/studentcounselor/mass/{userDcid}` | Mass Save Counselor for Students |
| POST | `/ws/studentcounselor/{studentDcid}` | Save Student Counselors |

## `/ws/students` — 学生级扩展接口

| Method | Path | Summary |
| --- | --- | --- |
| POST | `/ws/students/careertech/studentcredential` | Create a new student credential association. |
| DELETE | `/ws/students/careertech/studentcredential/{careerTechStudentCredentialsId}` | Delete a student credential association. |
| PUT | `/ws/students/careertech/studentcredential/{careerTechStudentCredentialsId}` | Update a student credential association. |
| POST | `/ws/students/careertech/studentprogram` | Create a new student program association. |
| DELETE | `/ws/students/careertech/studentprogram/{careerTechStudentProgramsId}` | Delete a student program association. |
| PUT | `/ws/students/careertech/studentprogram/{careerTechStudentProgramsId}` | Update a student program association. |
| POST | `/ws/students/health/contactlog` | Create a contact log |
| DELETE | `/ws/students/health/contactlog/{id}` | Delete a contactLog |
| PUT | `/ws/students/health/contactlog/{id}` | Update a contact log |
| POST | `/ws/students/health/healthPlan` | Create a student health plan |
| DELETE | `/ws/students/health/healthPlan/{healthStudentPlanId}` | Delete a Student Health Plan |
| GET | `/ws/students/health/healthPlan/{healthStudentPlanId}` | Get a Student Health Plan by ID |
| PUT | `/ws/students/health/healthPlan/{healthStudentPlanId}` | Update a Student Health Plan |
| POST | `/ws/students/health/healthStudMonitor` | Create a student health monitor |
| DELETE | `/ws/students/health/healthStudMonitor/{id}` | Delete a diabetic monitoring |
| GET | `/ws/students/health/healthStudMonitor/{id}` | Get a student health monitor by ID |
| PUT | `/ws/students/health/healthStudMonitor/{id}` | Update a student health monitor |
| POST | `/ws/students/health/medication` | Create a student Medication |
| POST | `/ws/students/health/medication/{id}` | Update a student Medication |
| POST | `/ws/students/health/medicationdose` | Create a Medication Dose |
| DELETE | `/ws/students/health/medicationdose/{id}` | Delete a medicationdose |
| PUT | `/ws/students/health/medicationdose/{id}` | Update a Medication Dose Record |
| POST | `/ws/students/health/medicationinventory` | Create a Medication Inv |
| PUT | `/ws/students/health/medicationinventory/{id}` | Update a Medication Inv Record |
| POST | `/ws/students/health/office_visit` | Create a Health Office Visit |
| GET | `/ws/students/health/office_visit/student` | Get Health Office Visits for a student |
| DELETE | `/ws/students/health/office_visit/{id}` | Delete a Student Health Office Visit |
| PUT | `/ws/students/health/office_visit/{id}` | Update a student health office record |
| POST | `/ws/students/health/other` | Create student Other |
| PUT | `/ws/students/health/other/{studentsDCID}` | Update a student Other data |
| POST | `/ws/students/health/pewaiver` | Create a PEWaiver Record |
| DELETE | `/ws/students/health/pewaiver/{id}` | Delete a PEWaiver Record |
| PUT | `/ws/students/health/pewaiver/{id}` | Update a PE Waiver Record |
| POST | `/ws/students/health/physical` | Create a Physical Record |
| DELETE | `/ws/students/health/physical/{id}` | Delete a Physical Record |
| PUT | `/ws/students/health/physical/{id}` | Update a Physicals Record |

## `/ws/v1` — 标准版本化 REST 资源（v1）

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/ws/v1/course/{id}` | Get a course |
| GET | `/ws/v1/district` | Get current district data |
| GET | `/ws/v1/district/school` | Get current schools in district |
| GET | `/ws/v1/district/school/count` | Get number of schools in district |
| GET | `/ws/v1/district/student` | Get one or more students |
| DELETE | `/ws/v1/event_subscription` | Delete all event subscriptions |
| GET | `/ws/v1/event_subscription` | Get event subscriptions |
| PUT | `/ws/v1/event_subscription` | Create or replace event subscriptions |
| POST | `/ws/v1/fee/transaction` | Post Fee Transaction |
| POST | `/ws/v1/fee/transactions` | Post Fee Transactions |
| GET | `/ws/v1/metadata` | Get powerschool metadata and maximum page size for resources. |
| GET | `/ws/v1/school` | Get current schools in district |
| GET | `/ws/v1/section/{id}` | Get a section |
| GET | `/ws/v1/section/{id}/section_enrollment` | Get student enrollment for a section |
| GET | `/ws/v1/section/{id}/section_enrollment/count` | Get student enrollment count for a section |
| GET | `/ws/v1/section_enrollment/{id}` | Get a section enrollment |
| GET | `/ws/v1/staff/{id}` | Get a staff record |
| GET | `/ws/v1/student/{id}` | Get a student by ID |
| GET | `/ws/v1/term/{id}` | Get a term |
| GET | `/ws/v1/test_subscription` | Test subscription GET |
| GET | `/ws/v1/time` | Get current server time/date |

## `/ws/workflow` — 工作流

| Method | Path | Summary |
| --- | --- | --- |
| PUT | `/ws/workflow/archivetask/{taskInstanceId}` | Archive task instance |
| PUT | `/ws/workflow/grouptaskassignment` | Edit a group task assignment of a user |
| PUT | `/ws/workflow/grouptaskassignment/unassign` | Unassign a user from a group task |
| POST | `/ws/workflow/taskassignment` | Save task assignment |
| POST | `/ws/workflow/taskassignment/archived_tasks` | Get all task assignment of school list |
| POST | `/ws/workflow/taskassignment/task_assignments_by_schools` | Get all task assignment of school list |
| GET | `/ws/workflow/taskassignment/user_archived_tasks` | Get all archived task assignments of the current user |
| GET | `/ws/workflow/taskassignment/user_task_assignments` | Get all active task assignments of the current user |
| POST | `/ws/workflow/taskassignment/users` | Get accessible users for the search string passed |
| DELETE | `/ws/workflow/taskassignment/{taskAssignmentId}` | Delete task assignment for the id passed |
| GET | `/ws/workflow/taskassignment/{taskAssignmentId}` | Get task assignment for the id passed |
| PUT | `/ws/workflow/taskassignment/{taskInstanceId}` | Edit task assignment |
| GET | `/ws/workflow/taskconfiguration` | Get task and notification configurations |
| POST | `/ws/workflow/taskconfiguration` | Save task and notification configurations |
| POST | `/ws/workflow/taskinstance` | Save task instance |
| PUT | `/ws/workflow/taskinstance` | Edit task instance |
| DELETE | `/ws/workflow/taskinstance/{taskInstanceId}` | Delete task instance for the id passed |
| GET | `/ws/workflow/taskinstance/{taskInstanceId}` | Get task instance for the id passed |

## `/ws/xte` — 教师/评分扩展（XTE / PowerTeacher Pro）

| Method | Path | Summary |
| --- | --- | --- |
| GET | `/ws/xte/app_metadata/pages` | Get metadata for Teacher Tools non-packaged external pages |
| DELETE | `/ws/xte/assignment/{assignment_id}/assignmentstandards` | Delete Assignment Standard Association |
| DELETE | `/ws/xte/assignment_section` | Delete Specified Assignment Section |
| DELETE | `/ws/xte/assignment_section/students` | Delete Specified Assignment Student Associations |
| GET | `/ws/xte/authorization/token/{plugin_identifier}` | Get an OAuth Authorization Token from the referenced Plugin |
| GET | `/ws/xte/conversion_scale` | Get conversion scales by ids or all |
| GET | `/ws/xte/conversion_scale/{conversion_scale_id}` | Get a conversion scale by id |
| GET | `/ws/xte/course/courseByNumber/{course_num}` | Get course by course number |
| GET | `/ws/xte/course/search` | Get all courses with course_number or course_name matching the query parameter while ignoring the ca… |
| POST | `/ws/xte/email/send` | Send an email message to a group of recipients. |
| GET | `/ws/xte/email/students` | Get the List of Students and their Contacts for a list of Sections. |
| POST | `/ws/xte/email/students` | Get the List of Students and their Contacts for a list of Sections and/or Students. |
| DELETE | `/ws/xte/grade_calculation_type/{id}` | Delete a Grade Calculation Type by id |
| GET | `/ws/xte/grade_formula_set/course/{course_dcid}` | Get the list of grade formula sets for the specified course. |
| GET | `/ws/xte/grade_formula_set/promote` | Get the current calculation formula promotion data. |
| POST | `/ws/xte/grade_formula_set/promote/{srcYearID}/{destYearID}/{updateConfigYearAfterPromotion}` | Promote grade formula sets from a source year to a destination year |
| GET | `/ws/xte/grade_formula_set/school/{schools_dcid}` | Get the list of grade formula sets for the specified school. |
| POST | `/ws/xte/grade_scale/grade_scale_school_assoc` | Create a grade scale school assocations |
| DELETE | `/ws/xte/grade_scale/grade_scale_school_assoc/{grade_scale_school_assoc_id}` | Delete a grade scale school association by ID |
| GET | `/ws/xte/grade_scale/grade_scale_school_assoc/{grade_scale_school_assoc_id}` | Get a grade scale to school association by id |
| PUT | `/ws/xte/grade_scale/grade_scale_school_assoc/{grade_scale_school_assoc_id}` | Update a grade scale school association by ID |
| GET | `/ws/xte/grade_scale/grade_scale_school_assoc_list/{grade_scale_school_assoc_schoolid}` | Get all grade scale to school association by school id |
| POST | `/ws/xte/grade_scale/grade_scale_school_assoc_mass_associate` | Create multiple grade scale school assocations |
| GET | `/ws/xte/grade_scale/grade_scale_section_student` | Get grade scale section student records. |
| POST | `/ws/xte/grade_scale/grade_scale_section_student` | Create a grade scale section student |
| DELETE | `/ws/xte/grade_scale/grade_scale_section_student/{grade_scale_section_student_id}` | Delete a grade scale section student by ID |
| GET | `/ws/xte/grade_scale/grade_scale_section_student/{grade_scale_section_student_id}` | Get a grade scale to section to student relation by id |
| PUT | `/ws/xte/grade_scale/grade_scale_section_student/{grade_scale_section_student_id}` | Update a grade scale section student by ID |
| GET | `/ws/xte/grade_scale/grade_scale_section_student_list/{section_id}` | Get all grade scale section students with matching section id |
| POST | `/ws/xte/grade_scale/grade_scale_section_student_mass_associate` | Creates many grade scale section students |
| GET | `/ws/xte/grade_scale/grade_scale_sections_student_list/{section_id}` | Get all grade scale section students with matching section id list |
| GET | `/ws/xte/grade_scale/light_scale` | Get all the grade scales names and descriptions |
| GET | `/ws/xte/grade_scale/scale` | Get all the grade scales |
| POST | `/ws/xte/grade_scale/scale` | Create a grade scale |
| DELETE | `/ws/xte/grade_scale/scale/{grade_scale_id}` | Delete a grade scale by ID |
| GET | `/ws/xte/grade_scale/scale/{grade_scale_id}` | Get a grade scale by ID |
| PUT | `/ws/xte/grade_scale/scale/{grade_scale_id}` | Update a grade scale by ID |
| GET | `/ws/xte/grade_scale/scales/{grade_scale_ids}` | Get all the grade scales that match the ID list passed in |
| GET | `/ws/xte/grade_scale/special_scales` | Get all the special grade scales |
| GET | `/ws/xte/grade_section_config/count` | Get number of Grade Section Config by School and Formula Set ID |
| GET | `/ws/xte/pluginlinks` | Get plugin-defined links |
| GET | `/ws/xte/school/comment` | Get all the standards and final grades comment settings for all schools. |
| GET | `/ws/xte/school/sections/{school_dcid}` | Get the sections for the specified school. |
| PUT | `/ws/xte/score` | Create or Update Scores |
| PUT | `/ws/xte/score/assignment` | Create or Update a single Assignment Score |
| POST | `/ws/xte/score/copy_assignment_scores` | Copy Assignment Scores |
| GET | `/ws/xte/section/assignment/` | Get Assignments by Section |
| POST | `/ws/xte/section/assignment/` | Create a Section Assignment |
| DELETE | `/ws/xte/section/assignment/{id}` | Delete a Section Assignment by ID |
| GET | `/ws/xte/section/assignment/{id}` | Get a Section Assignment |
| PUT | `/ws/xte/section/assignment/{id}` | Update a Section Assignment |
| GET | `/ws/xte/section/class_description` | Get the custom class description for a list of section IDs |
| POST | `/ws/xte/section/class_description` | Update the custom class description |
| GET | `/ws/xte/section/class_schedule` | Get the class schedule for the logged in user current year context, and given start and end dates an… |
| GET | `/ws/xte/section/conversion/counts` | Get the PTG and PTP assignment counts for a list of section_ids |
| POST | `/ws/xte/section/lock_override` | Override Term Locks for a Section until a specific date. |
| GET | `/ws/xte/section/lock_status` | Get the lock status for the requested sections |
| POST | `/ws/xte/section/nickname` | Update the section nickname for the currently logged in teacher. |
| GET | `/ws/xte/section/section_info` | Get the BasicSectionLeadInfo and TeacherCategory arrays for a list of section_ids |
| GET | `/ws/xte/section/standard` | Get the Standards for assignments based on a list of section IDs |
| PUT | `/ws/xte/section/{section_id}/convert` | Convert this PTG section data to the PTP tables for the section_id |
| GET | `/ws/xte/standard` | Get a standard by longitudinalid and year_id |
| POST | `/ws/xte/standard` | Create a Standard |
| GET | `/ws/xte/standard/branch` | Get all standards in a branch with name or identifier matching the query parameter while ignoring th… |
| GET | `/ws/xte/standard/branch/count` | Get the count of all standards in a branch with name or identifier matching the query parameter whil… |
| GET | `/ws/xte/standard/children` | Get standards by parent standard_id |
| GET | `/ws/xte/standard/children/count` | Get number of standards by parent standard_id |
| GET | `/ws/xte/standard/count` | Get number of standards by longitudinalid and year_id |
| PUT | `/ws/xte/standard/course` | Update the included standard course associations |
| DELETE | `/ws/xte/standard/course/lower_weights` | Remove the indicated standard course lower weights |
| GET | `/ws/xte/standard/course/{course_num}` | Get a list of standards associated with a course number and year_id |
| GET | `/ws/xte/standard/course/{course_num}/count` | Get a count of standards associated with a course number and year_id |
| GET | `/ws/xte/standard/identifier` | Get standard by identifier and year_id |
| GET | `/ws/xte/standard/identifier/update` | Get standard by identifier and year_id for update |
| POST | `/ws/xte/standard/list` | Get standards identified by a list of standard(s)/section(s) |
| GET | `/ws/xte/standard/list/{standard_ids}` | Get standards identified by a list of standard IDs |
| POST | `/ws/xte/standard/promote/{sourceYearID}/{destYearID}/{setDefaultYear}` | Promote standards from a source year to destination year |
| POST | `/ws/xte/standard/score` | Get standard scores |
| GET | `/ws/xte/standard/search` | Get all standards whose name or identifier matches the query parameter while ignoring the case |
| DELETE | `/ws/xte/standard/{standard_id}` | Delete a standard by id |
| GET | `/ws/xte/standard/{standard_id}` | Get a standard and embedded course assocations by id |
| PUT | `/ws/xte/standard/{standard_id}` | Update a standard by id |
| POST | `/ws/xte/standard_grade_section` | Get All Standard Final Grades |
| PUT | `/ws/xte/standard_grade_section` | Update Standard Final Grades |
| POST | `/ws/xte/standard_grade_section/metrics` | Standard Grade Metrics |
| POST | `/ws/xte/standard_grade_section/recalculate` | Standard Final Grades |
| GET | `/ws/xte/standard_grade_section/rollup` | Get Standard Grade Rollup |
| GET | `/ws/xte/standard_grade_section/student` | Get Standard Information |
| GET | `/ws/xte/standard_grade_section/student/years` | Get Year ID |
| GET | `/ws/xte/student` | Get student enrollments for a list of sections. |
| GET | `/ws/xte/student/school/{school_dcid}` | Get teacher students for sections |
| GET | `/ws/xte/student/school/{school_dcid}/search` | Search students by school DCID and name query |
| GET | `/ws/xte/student/{student_id}/enrollments` | Get section enrollment information for a student and year |
| GET | `/ws/xte/teacher_category` | Get a list of teacher categories for the current user. |
| POST | `/ws/xte/teacher_category` | Create a teacher category. |
| PUT | `/ws/xte/teacher_category/reorder` | Set the display position of multiple TeacherCategory records. |
| GET | `/ws/xte/teacher_category/users/{user_dcids}` | Get a list of teacher categories for the list of users dcids |
| DELETE | `/ws/xte/teacher_category/{teacher_category_id}` | Delete a teacher category. |
| GET | `/ws/xte/teacher_category/{teacher_category_id}` | Get a teacher category by ID. |
| PUT | `/ws/xte/teacher_category/{teacher_category_id}` | Update a teacher category. |
| POST | `/ws/xte/teacher_comment_bank` | Create a comment record for the current teacher. |
| PUT | `/ws/xte/teacher_comment_bank` | Update existing teacher comments record for the current teacher. |
| POST | `/ws/xte/teacher_comment_bank/migrateptgcomments` | Migrate teacher comment records from PTG to PTP for the current teacher. |
| DELETE | `/ws/xte/teacher_comment_bank/{teacher_comment_bank_id}` | Delete a teacher comment by Teacher Comment Bank ID for the current teacher. |
| GET | `/ws/xte/teacher_comment_bank/{teacher_comment_bank_id}` | Get a teacher comment record by Teacher Comment Bank ID for the current teacher. |
| PUT | `/ws/xte/teacher_comment_bank/{teacher_comment_bank_id}` | Update a teacher comment favorite field value by Teacher Comment Bank ID for the current teacher. |
| GET | `/ws/xte/teacher_section_standard_assoc` | Get the List of Teacher Section Standard Associations for the Logged-in User. |
| POST | `/ws/xte/teacher_section_standard_assoc` | Create a new Teacher Section Standard Association |
| PUT | `/ws/xte/teacher_section_standard_assoc` | Update or Create a Teacher Section Standard Association. |
| DELETE | `/ws/xte/teacher_section_standard_assoc/section/code` | Delete a Teacher Section Standard Association. |
| GET | `/ws/xte/teacher_section_standard_assoc/section/code` | Get the specified Teacher Section Standard Association with the Section and Storecode. |
| GET | `/ws/xte/teacher_section_standard_assoc/{id}` | Get the specified Teacher Section Standard Association. |
| POST | `/ws/xte/termbin/lock_override` | Override Term Locks for a Reporting Term until a specific date. |
| GET | `/ws/xte/termbin/lock_status` | Get the lock status for the requested reporting terms |
| GET | `/ws/xte/termbin/sections` | Get sorted termbins by section_ids |
| GET | `/ws/xte/user/teacher/me` | Get the currently logged in teacher |
| GET | `/ws/xte/user/teacher/me/session` | Get the currently logged in teacher's session information |
