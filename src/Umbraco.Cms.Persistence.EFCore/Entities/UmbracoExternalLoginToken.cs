﻿using System;
using System.Collections.Generic;

namespace Umbraco.Cms.Persistence.EFCore.Entities
{
    public partial class UmbracoExternalLoginToken
    {
        public int Id { get; set; }
        public int ExternalLoginId { get; set; }
        public string Name { get; set; } = null!;
        public string Value { get; set; } = null!;
        public DateTime CreateDate { get; set; }

        public virtual UmbracoExternalLogin ExternalLogin { get; set; } = null!;
    }
}