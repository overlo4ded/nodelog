/**
 * http://usejsdoc.org/
 */
var _fs = require("fs");
var _path = require("path");
var _Promise = require("bluebird");
var _settings = require("settings");
var _dateformat = require("dateformat");

var Nodelog = function(params){
	
};
Nodelog.prototype.appenders=[];
Nodelog.prototype.listeners=[];
Nodelog.prototype.root={};

Nodelog.prototype.toConsole=function(msg,level,appender){	
	console.log(this._format(msg,level,appender.pattern));
};
Nodelog.prototype.toFile=function(msg,level,appender){
	var message = this._format(msg,level,appender.pattern);
	_fs.appendFile(appender.file, message,{encoding:"utf8"},function(err){if(err){console.error(err);}});
};
Nodelog.prototype._format=function(msg,level,pattern){
	var dt = _dateformat(new Date(),"dd/mm/yyyy HH:MM:ss.l");
	var message="";
	if(pattern){
		message=pattern.replace(/%d/g,dt);
		message=message.replace(/%l/g,this.LEVEL.toString(level));
		message=message.replace(/%n/g,this.name);
		message=message.replace(/%m/g,msg);
	}
	return message+"\n";
};
Nodelog.prototype.LEVEL={
	DEBUG:5,WARN:10,INFO:15,ERROR:20,
	toString:function(value){
		var str="";
		switch(value){
			case this.DEBUG:
				str="debug";
				break;
			case this.WARN:
				str="warn";
				break;
			case this.INFO:
				str="info";
				break;
			case this.ERROR:
				str="error";
				break;
		}
		return str;
	}
	,fromString:function(str){
		var v=null;
		switch(str){
			case "debug":
				v=this.DEBUG;
				break;
			case "warn":
				v=this.WARN;
				break;
			case "info":
				v=this.INFO;
				break;
			case "error":
				v=this.ERROR;
				break;
		}
		return v;
	}
};
Nodelog.prototype.trace=function(msg,level){
	if(!this.root.enabled){return;}
	var str_level = this.LEVEL.toString(level);
	var appenders_name = [];
	if(this.listeners[this.name] && level>=this.LEVEL.fromString(this.listeners[this.name].level)){
		appenders_name = this.listeners[this.name].appenders;				
	}else if(this.root && level>=this.LEVEL.fromString(this.root.level)){
		appenders_name = this.root.appenders;
	}
	if(appenders_name){
		appenders_name.forEach(function(appender_name,i){
			var appender = this.appenders[appender_name];		
			if(appender){
				//defer the execution to the queue and to the next process tick
				process.nextTick(function(){appender.callback.bind(this)(msg,level,appender);}.bind(this));
			}
		}.bind(this));
	}
};
Nodelog.prototype.debug=function(msg){
	this.trace(msg,this.LEVEL.DEBUG);
};
Nodelog.prototype.warn=function(msg){
	this.trace(msg,this.LEVEL.WARN);
};
Nodelog.prototype.info=function(msg){
	this.trace(msg,this.LEVEL.INFO);
};
Nodelog.prototype.error=function(msg){
	this.trace(msg,this.LEVEL.ERROR);
};

Nodelog.getLogger=function(params){
	var instance=new Nodelog();
	if(params){
		instance.configpath=params.configpath;
		instance.fullname=params.name;
		if(instance.fullname){
			instance.name = _path.basename(instance.fullname);
		}
	}
	return instance;
};
//#############################################
// inizializzazione statica della configurazione
//#############################################
/**
 * check file
 */
var fileExists=function(filePath){
    try
    {
        return _fs.statSync(filePath).isFile();
    }
    catch (err)
    {
        return false;
    }
};

var basedir = _settings.PROJECT_DIR;
var currentdir = __dirname;
var f=null;
var loop=1;
var __MAX = 10;
var counter=__MAX;
while(loop>0 && counter>0){
	console.info("nodelog looking for nodelog-config.json into :"+currentdir);
	if(fileExists(currentdir+"/nodelog-config.json")){
		f = _fs.readFileSync(currentdir+"/nodelog-config.json","utf8");
		console.info("nodelog nodelog-config.json found into :"+currentdir);
		break;
	}else{
		var cfg_dir = _path.resolve(currentdir, '..', 'config');
		console.info("nodelog looking for nodelog-config.json into :"+cfg_dir);
		if(fileExists(cfg_dir+"/nodelog-config.json")){
			f = _fs.readFileSync(cfg_dir+"/nodelog-config.json","utf8");
			console.info("nodelog nodelog-config.json found into :"+cfg_dir);
			break;
		}		
		currentdir = _path.resolve(currentdir, '..', '..');
	}
	loop--;
	loop=(currentdir===basedir)?loop:1;		
	counter--;
}
if(!f){
	console.error("Config file not found");
	return;
}
var _conf = JSON.parse(f);
if(!_conf){ console.error("Missing nodelog-config");return;}

_conf.appenders.forEach(function(appender,i){
	if(appender.name){
		appender.callback=null;
		if("console"===appender.type){
			appender.callback=Nodelog.prototype.toConsole;			
		}else if("file"===appender.type){
			appender.callback=Nodelog.prototype.toFile;
		}
		Nodelog.prototype.appenders[appender.name]=appender;
	}
});
_conf.listeners.forEach(function(listener,i){
	if(listener.name && listener.appenders){
		Nodelog.prototype.listeners[listener.name]={name:listener.name,appenders:listener.appenders,level:listener.level};
	}
});
Nodelog.prototype.root=_conf.root;
	

module.exports= Nodelog;
