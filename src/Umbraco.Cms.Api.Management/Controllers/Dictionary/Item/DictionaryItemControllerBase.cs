﻿using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core;

namespace Umbraco.Cms.Api.Management.Controllers.Dictionary.Item;

[ApiController]
[VersionedApiBackOfficeRoute("dictionary")]
[ApiExplorerSettings(GroupName = "Dictionary")]
public class DictionaryItemControllerBase : ManagementApiControllerBase
{
}
