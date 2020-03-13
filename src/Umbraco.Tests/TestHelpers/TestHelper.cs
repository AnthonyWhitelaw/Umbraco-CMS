﻿using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Web;
using Moq;
using NUnit.Framework;
using Umbraco.Core;
using Umbraco.Core.Cache;
using Umbraco.Core.Composing;
using Umbraco.Core.Configuration;
using Umbraco.Core.Configuration.UmbracoSettings;
using Umbraco.Core.Diagnostics;
using Umbraco.Core.Hosting;
using Umbraco.Core.IO;
using Umbraco.Core.Logging;
using Umbraco.Core.Models;
using Umbraco.Core.Models.Entities;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Core.Persistence;
using Umbraco.Core.PropertyEditors;
using Umbraco.Core.Serialization;
using Umbraco.Core.Services;
using Umbraco.Core.Strings;
using Umbraco.Net;
using Umbraco.Tests.Common;
using Umbraco.Web;
using Umbraco.Web.Hosting;
using Umbraco.Web.Routing;
using File = System.IO.File;

namespace Umbraco.Tests.TestHelpers
{
    /// <summary>
    /// Common helper properties and methods useful to testing
    /// </summary>
    public static class TestHelper
    {
        private static TestHelperInternal _testHelperInternal = new TestHelperInternal();
        private class TestHelperInternal : TestHelperBase
        {
            public TestHelperInternal() : base(typeof(TestHelperInternal).Assembly)
            {

            }

            public override IDbProviderFactoryCreator DbProviderFactoryCreator { get; } = new UmbracoDbProviderFactoryCreator(Constants.DbProviderNames.SqlCe);

            public override IBulkSqlInsertProvider BulkSqlInsertProvider { get; } = new SqlCeBulkSqlInsertProvider();

            public override IMarchal Marchal { get; } = new FrameworkMarchal();

            public override IBackOfficeInfo GetBackOfficeInfo()
                => new AspNetBackOfficeInfo(
                    SettingsForTests.GenerateMockGlobalSettings(GetUmbracoVersion(), IOHelper),
                    TestHelper.IOHelper, Mock.Of<ILogger>(), SettingsForTests.GenerateMockWebRoutingSettings());

            public override IHostingEnvironment GetHostingEnvironment()
                => new AspNetHostingEnvironment(SettingsForTests.GetDefaultHostingSettings());

            public override IIpResolver GetIpResolver()
                => new AspNetIpResolver();
        }

        public static ITypeFinder GetTypeFinder() => _testHelperInternal.GetTypeFinder();

        public static TypeLoader GetMockedTypeLoader() => _testHelperInternal.GetMockedTypeLoader();

        public static Configs GetConfigs() => _testHelperInternal.GetConfigs();

        public static IRuntimeState GetRuntimeState() => _testHelperInternal.GetRuntimeState();

        public static IBackOfficeInfo GetBackOfficeInfo() => _testHelperInternal.GetBackOfficeInfo();

        public static IConfigsFactory GetConfigsFactory() => _testHelperInternal.GetConfigsFactory();

        /// <summary>
        /// Gets the current assembly directory.
        /// </summary>
        /// <value>The assembly directory.</value>
        public static string CurrentAssemblyDirectory => _testHelperInternal.CurrentAssemblyDirectory;

        public static IShortStringHelper ShortStringHelper => _testHelperInternal.ShortStringHelper;
        public static IJsonSerializer JsonSerializer => _testHelperInternal.JsonSerializer;
        public static IVariationContextAccessor VariationContextAccessor => _testHelperInternal.VariationContextAccessor;
        public static IDbProviderFactoryCreator DbProviderFactoryCreator => _testHelperInternal.DbProviderFactoryCreator;
        public static IBulkSqlInsertProvider BulkSqlInsertProvider => _testHelperInternal.BulkSqlInsertProvider;
        public static IMarchal Marchal => _testHelperInternal.Marchal;
        public static ICoreDebug CoreDebug => _testHelperInternal.CoreDebug;


        public static IIOHelper IOHelper => _testHelperInternal.IOHelper;
        public static IMainDom MainDom => _testHelperInternal.MainDom;
        public static UriUtility UriUtility => _testHelperInternal.UriUtility;

        public static IWebRoutingSettings WebRoutingSettings => _testHelperInternal.WebRoutingSettings;

        /// <summary>
        /// Maps the given <paramref name="relativePath"/> making it rooted on <see cref="CurrentAssemblyDirectory"/>. <paramref name="relativePath"/> must start with <code>~/</code>
        /// </summary>
        /// <param name="relativePath">The relative path.</param>
        /// <returns></returns>
        public static string MapPathForTest(string relativePath) => _testHelperInternal.MapPathForTest(relativePath);

        public static void InitializeContentDirectories()
        {
            CreateDirectories(new[] { Constants.SystemDirectories.MvcViews, SettingsForTests.GenerateMockGlobalSettings().UmbracoMediaPath, Constants.SystemDirectories.AppPlugins });
        }

        public static void CleanContentDirectories()
        {
            CleanDirectories(new[] { Constants.SystemDirectories.MvcViews, SettingsForTests.GenerateMockGlobalSettings().UmbracoMediaPath });
        }

        public static void CreateDirectories(string[] directories)
        {
            foreach (var directory in directories)
            {
                var directoryInfo = new DirectoryInfo(IOHelper.MapPath(directory));
                if (directoryInfo.Exists == false)
                    Directory.CreateDirectory(IOHelper.MapPath(directory));
            }
        }

        public static void CleanDirectories(string[] directories)
        {
            var preserves = new Dictionary<string, string[]>
            {
                { Constants.SystemDirectories.MvcViews, new[] {"dummy.txt"} }
            };
            foreach (var directory in directories)
            {
                var directoryInfo = new DirectoryInfo(IOHelper.MapPath(directory));
                var preserve = preserves.ContainsKey(directory) ? preserves[directory] : null;
                if (directoryInfo.Exists)
                    foreach (var x in directoryInfo.GetFiles().Where(x => preserve == null || preserve.Contains(x.Name) == false))
                        x.Delete();
            }
        }

        public static void CleanUmbracoSettingsConfig()
        {
            var currDir = new DirectoryInfo(CurrentAssemblyDirectory);

            var umbracoSettingsFile = Path.Combine(currDir.Parent.Parent.FullName, "config", "umbracoSettings.config");
            if (File.Exists(umbracoSettingsFile))
                File.Delete(umbracoSettingsFile);
        }

        // TODO: Move to Assertions or AssertHelper
        // FIXME: obsolete the dateTimeFormat thing and replace with dateDelta
        public static void AssertPropertyValuesAreEqual(object actual, object expected, string dateTimeFormat = null, Func<IEnumerable, IEnumerable> sorter = null, string[] ignoreProperties = null)
        {
            const int dateDeltaMilliseconds = 500; // .5s

            var properties = expected.GetType().GetProperties();
            foreach (var property in properties)
            {
                // ignore properties that are attributed with EditorBrowsableState.Never
                var att = property.GetCustomAttribute<EditorBrowsableAttribute>(false);
                if (att != null && att.State == EditorBrowsableState.Never)
                    continue;

                // ignore explicitely ignored properties
                if (ignoreProperties != null && ignoreProperties.Contains(property.Name))
                    continue;

                var actualValue = property.GetValue(actual, null);
                var expectedValue = property.GetValue(expected, null);

                AssertAreEqual(property, expectedValue, actualValue, sorter, dateDeltaMilliseconds);
            }
        }

        private static void AssertAreEqual(PropertyInfo property, object expected, object actual, Func<IEnumerable, IEnumerable> sorter = null, int dateDeltaMilliseconds = 0)
        {
            if (!(expected is string) && expected is IEnumerable)
            {
                // sort property collection by alias, not by property ids
                // on members, built-in properties don't have ids (always zero)
                if (expected is PropertyCollection)
                    sorter = e => ((PropertyCollection) e).OrderBy(x => x.Alias);

                // compare lists
                AssertListsAreEqual(property, (IEnumerable) actual, (IEnumerable) expected, sorter, dateDeltaMilliseconds);
            }
            else if (expected is DateTime expectedDateTime)
            {
                // compare date & time with delta
                var actualDateTime = (DateTime) actual;
                var delta = (actualDateTime - expectedDateTime).TotalMilliseconds;
                Assert.IsTrue(Math.Abs(delta) <= dateDeltaMilliseconds, "Property {0}.{1} does not match. Expected: {2} but was: {3}", property.DeclaringType.Name, property.Name, expected, actual);
            }
            else if (expected is Property expectedProperty)
            {
                // compare values
                var actualProperty = (Property) actual;
                var expectedPropertyValues = expectedProperty.Values.OrderBy(x => x.Culture).ThenBy(x => x.Segment).ToArray();
                var actualPropertyValues = actualProperty.Values.OrderBy(x => x.Culture).ThenBy(x => x.Segment).ToArray();
                if (expectedPropertyValues.Length != actualPropertyValues.Length)
                    Assert.Fail($"{property.DeclaringType.Name}.{property.Name}: Expected {expectedPropertyValues.Length} but got {actualPropertyValues.Length}.");
                for (var i = 0; i < expectedPropertyValues.Length; i++)
                {
                    Assert.AreEqual(expectedPropertyValues[i].EditedValue, actualPropertyValues[i].EditedValue, $"{property.DeclaringType.Name}.{property.Name}: Expected draft value \"{expectedPropertyValues[i].EditedValue}\" but got \"{actualPropertyValues[i].EditedValue}\".");
                    Assert.AreEqual(expectedPropertyValues[i].PublishedValue, actualPropertyValues[i].PublishedValue, $"{property.DeclaringType.Name}.{property.Name}: Expected published value \"{expectedPropertyValues[i].EditedValue}\" but got \"{actualPropertyValues[i].EditedValue}\".");
                }
            }
            else if (expected is IDataEditor expectedEditor)
            {
                Assert.IsInstanceOf<IDataEditor>(actual);
                var actualEditor = (IDataEditor) actual;
                Assert.AreEqual(expectedEditor.Alias,  actualEditor.Alias);
                // what else shall we test?
            }
            else
            {
                // directly compare values
                Assert.AreEqual(expected, actual, "Property {0}.{1} does not match. Expected: {2} but was: {3}", property.DeclaringType.Name, property.Name,
                    expected?.ToString() ?? "<null>", actual?.ToString() ?? "<null>");
            }
        }

        private static void AssertListsAreEqual(PropertyInfo property, IEnumerable expected, IEnumerable actual, Func<IEnumerable, IEnumerable> sorter = null, int dateDeltaMilliseconds = 0)
        {


            if (sorter == null)
            {
                // this is pretty hackerific but saves us some code to write
                sorter = enumerable =>
                {
                    // semi-generic way of ensuring any collection of IEntity are sorted by Ids for comparison
                    var entities = enumerable.OfType<IEntity>().ToList();
                    return entities.Count > 0 ? (IEnumerable) entities.OrderBy(x => x.Id) : entities;
                };
            }

            var expectedListEx = sorter(expected).Cast<object>().ToList();
            var actualListEx = sorter(actual).Cast<object>().ToList();

            if (actualListEx.Count != expectedListEx.Count)
                Assert.Fail("Collection {0}.{1} does not match. Expected IEnumerable containing {2} elements but was IEnumerable containing {3} elements", property.PropertyType.Name, property.Name, expectedListEx.Count, actualListEx.Count);

            for (var i = 0; i < actualListEx.Count; i++)
                AssertAreEqual(property, expectedListEx[i], actualListEx[i], sorter, dateDeltaMilliseconds);
        }

        public static void DeleteDirectory(string path)
        {
            Try(() =>
            {
                if (Directory.Exists(path) == false) return;
                foreach (var file in Directory.EnumerateFiles(path, "*", SearchOption.AllDirectories))
                    File.Delete(file);
            });

            Try(() =>
            {
                if (Directory.Exists(path) == false) return;
                Directory.Delete(path, true);
            });
        }

        public static void TryAssert(Action action, int maxTries = 5, int waitMilliseconds = 200)
        {
            Try<AssertionException>(action, maxTries, waitMilliseconds);
        }

        public static void Try(Action action, int maxTries = 5, int waitMilliseconds = 200)
        {
            Try<Exception>(action, maxTries, waitMilliseconds);
        }

        public static void Try<T>(Action action, int maxTries = 5, int waitMilliseconds = 200)
            where T : Exception
        {
            var tries = 0;
            while (true)
            {
                try
                {
                    action();
                    break;
                }
                catch (T)
                {
                    if (tries++ > maxTries)
                        throw;
                    Thread.Sleep(waitMilliseconds);
                }
            }
        }

        // TODO: Move to MockedValueEditors.cs
        public static DataValueEditor CreateDataValueEditor(string name)
        {
            var valueType = (ValueTypes.IsValue(name)) ? name : ValueTypes.String;

            return new DataValueEditor(
                Mock.Of<IDataTypeService>(),
                Mock.Of<ILocalizationService>(),
                Mock.Of<ILocalizedTextService>(),
                Mock.Of<IShortStringHelper>(),
                new DataEditorAttribute(name, name, name)
                {
                    ValueType = valueType
                }

            );
        }


        public static IUmbracoVersion GetUmbracoVersion() => _testHelperInternal.GetUmbracoVersion();

        public static IRegister GetRegister() => _testHelperInternal.GetRegister();

        public static IHostingEnvironment GetHostingEnvironment() => _testHelperInternal.GetHostingEnvironment();

        public static IIpResolver GetIpResolver() => _testHelperInternal.GetIpResolver();

        public static IRequestCache GetRequestCache() => _testHelperInternal.GetRequestCache();

        public static IHttpContextAccessor GetHttpContextAccessor(HttpContextBase httpContextBase = null)
        {
            if (httpContextBase is null)
            {
                var httpContextMock = new Mock<HttpContextBase>();

                httpContextMock.Setup(x => x.DisposeOnPipelineCompleted(It.IsAny<IDisposable>()))
                    .Returns(Mock.Of<ISubscriptionToken>());

                httpContextBase = httpContextMock.Object;
            }

            var mock = new Mock<IHttpContextAccessor>();

            mock.Setup(x => x.HttpContext).Returns(httpContextBase);

            return mock.Object;
        }

        public static IPublishedUrlProvider GetPublishedUrlProvider() => _testHelperInternal.GetPublishedUrlProvider();
    }
}
