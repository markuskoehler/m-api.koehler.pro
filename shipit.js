var fs = require('fs');
var shipitConfig = null;
try {
    shipitConfig = JSON.parse(fs.readFileSync('./deploy.json', 'utf8'));
} catch(e) {
    console.log('No deploy.json file, shipit will not be configured');
    console.log(e);
}

module.exports.shipitConfig = shipitConfig;
module.exports.shipitInit = function (shipit) {
    var fs = require('fs');

    require('shipit-deploy')(shipit);
    require('shipit-shared')(shipit);
    require('shipit-composer')(shipit);
    require('shipit-npm')(shipit);
    require('shipit-bower')(shipit);

    /*-----------------------------------------------------------------------------------------------
     | EVENTS
     */

    /*
     | After Bower is installed, do our local things to do
     */
    shipit.on('bower_installed', function () {
        shipit.start([
            'compile-assets'
        ]);
    });

    /*
     | Before updating the symlink, we go into maintainance mode
     */
    shipit.on('updated', function () {
        shipit.start([
            'artisan-down'
        ]);
    });

    /*
     | After the deployment is done, do our remote things to do
     */
    shipit.on('deployed', function () {
        shipit.start([
            'artisan-migrate',
            'artisan-clear',
            'artisan-optimize',
            'artisan-import-translations',
            'artisan-up'
        ]);
    });

    /*
     | After the deployment is done, do our remote things to do
     */
    shipit.on('rollbacked', function () {
        shipit.start([
            'artisan-rollback',
            'artisan-up'
        ]);
    });

    /*-----------------------------------------------------------------------------------------------
     | TASKS
     */

    /*
     | Compile the assets locally
     */
    shipit.blTask('compile-assets', function () {
        return shipit.local('gulp --production', {"cwd": shipit.config.workspace});
    });

    /*
     | Run laravel commands on the remote
     */
    shipit.blTask('artisan-migrate', function () {
        var php = shipit.config.php.command;
        var artisanCommand = php + ' artisan migrate';
        if (shipit.config.laravel.resetDb) {
            artisanCommand += ':refresh';
        }

        if (shipit.config.laravel.seedDb) {
            artisanCommand += ' --seed';
        }

        artisanCommand += ' --force';

        return shipit.remote('cd ' + shipit.releasePath
            + ' && ' + artisanCommand
        ).then(function(res) {
            shipit.log(res);
        });
    });

    shipit.blTask('artisan-rollback', function () {
        var php = shipit.config.php.command;
        return shipit.remote('cd ' + shipit.releasePath
            + ' && ' + php + ' artisan rollback'
        ).then(function(res) {
            shipit.log(res);
        });
    });

    shipit.blTask('artisan-down', function () {
        var php = shipit.config.php.command;
        return shipit.remote('cd ' + shipit.releasePath
            + ' && ' + php + ' artisan down'
        ).then(function(res) {
            shipit.log(res);
        });
    });

    shipit.blTask('artisan-clear', function () {
        var php = shipit.config.php.command;
        return shipit.remote('cd ' + shipit.releasePath
            + ' && ' + php + ' artisan clear-compiled '
            + ' && ' + php + ' artisan view:clear '
            + ' && ' + php + ' artisan route:clear '
            + ' && ' + php + ' artisan cache:clear '
            + ' && ' + php + ' artisan config:clear '
            + ' && ' + php + ' artisan ide-helper:generate '
        ).then(function(res) {
            shipit.log(res);
        });
    });

    shipit.blTask('artisan-optimize', function () {
        var php = shipit.config.php.command;
        return shipit.remote('cd ' + shipit.releasePath
            // + ' && ' + php + ' artisan config:cache ' // Seems to be causing trouble with reading .env in code, CAREFUL
            + ' && ' + php + ' artisan route:cache '
        ).then(function(res) {
            shipit.log(res);
        });
    });

    shipit.blTask('artisan-import-translations', function () {
        var php = shipit.config.php.command;
        return shipit.remote('cd ' + shipit.releasePath
            + ' && ' + php + ' artisan translations:import'
        ).then(function(res) {
            shipit.log(res);
        });
    });

    shipit.blTask('artisan-up', function () {
        var php = shipit.config.php.command;
        return shipit.remote('cd ' + shipit.releasePath
            + ' && ' + php + ' artisan up'
        ).then(function(res) {
            shipit.log(res);
        });
    });

    /*-----------------------------------------------------------------------------------------------
     | EVENTS
     */

    shipit.initConfig(shipitConfig);
};
