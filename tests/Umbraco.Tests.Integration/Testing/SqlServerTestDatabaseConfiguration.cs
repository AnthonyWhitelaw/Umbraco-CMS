// Copyright (c) Umbraco.
// See LICENSE for more details.

using System.Data;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using NUnit.Framework.Internal;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Persistence.SqlServer;

// ReSharper disable ConvertToUsingDeclaration
namespace Umbraco.Cms.Tests.Integration.Testing;

/// <remarks>
///     It's not meant to be pretty, rushed port of LocalDb.cs + LocalDbTestDatabase.cs
/// </remarks>
public class SqlServerTestDatabaseConfiguration : ITestDatabaseConfiguration
{
    private Guid _key;
    private string _connectionString;
    private string _masterConnectionString;

    public SqlServerTestDatabaseConfiguration(string connectionString)
    {
        _masterConnectionString = connectionString;
    }
    public ConnectionStrings InitializeConfiguration()
    {
        _key = Guid.NewGuid();

        CreateDatabase();

        _connectionString = ConstructConnectionString(_masterConnectionString, _key.ToString());


        return new ConnectionStrings
        {
            ConnectionString = _connectionString,
            ProviderName = "Microsoft.Data.SqlClient"
        };
    }

    public string Key => _key.ToString();

    private void CreateDatabase()
    {
        Teardown(_key.ToString());
        using (var connection = new SqlConnection(_masterConnectionString))
        {
            connection.Open();
            using (var command = connection.CreateCommand())
            {
                SetCommand(command, $@"CREATE DATABASE {LocalDb.QuotedName(_key.ToString())}");
                command.ExecuteNonQuery();
            }

            connection.Close();
        }
    }

    public void Teardown(string key)
    {
        using (var connection = new SqlConnection(_masterConnectionString))
        {
            connection.Open();
            using (var command = connection.CreateCommand())
            {
                SetCommand(command, "select count(1) from sys.databases where name = @0", key);
                var records = (int)command.ExecuteScalar();
                if (records == 0)
                {
                    return;
                }

                var sql = $@"
                        ALTER DATABASE {LocalDb.QuotedName(key)}
                        SET SINGLE_USER 
                        WITH ROLLBACK IMMEDIATE";
                SetCommand(command, sql);
                command.ExecuteNonQuery();

                SetCommand(command, $@"DROP DATABASE {LocalDb.QuotedName(key)}");
                command.ExecuteNonQuery();
            }
            
            connection.Close();
        }
    }

    protected static void SetCommand(SqlCommand command, string sql, params object[] args)
    {
        command.CommandType = CommandType.Text;
        command.CommandText = sql;
        command.Parameters.Clear();

        for (var i = 0; i < args.Length; i++)
        {
            command.Parameters.AddWithValue("@" + i, args[i]);
        }
    }
    
    private static string ConstructConnectionString(string masterConnectionString, string databaseName)
    {
        var prefix = Regex.Replace(masterConnectionString, "Database=.+?;", string.Empty);
        var connectionString = $"{prefix};Database={databaseName};";
        return connectionString.Replace(";;", ";");
    }
}