angular.module('iflux.issues', ['ngTagsInput'])

    //Issue list controller
    .controller('IssueCtrl', function(IssueService, apiUrl, $http, $ionicHistory, $ionicLoading, $scope, $state) {

        //Get all issues
    $scope.currentPage = 0;
	IssueService.getIssues(
		$scope.currentPage,
		function(data){
			$scope.issues = data;
			$scope.currentPage++;
			//$log.debug(data);
		}, 
		function(error){
			$scope.error = error;
		}
	);

	$scope.loadMoreIssues = function(){
		IssueService.getIssues(
			$scope.currentPage,
			function(data){
				Array.prototype.push.apply($scope.issues, data);
				$scope.currentPage++;
			},
			function(error){
				$scope.error = error;
			}
		);
	}
})
    // Specific issue controller

    .controller('IssueDetailsCtrl', function(IssueService, $log, $scope, $stateParams) {
        IssueService.getDetails(
            $stateParams.issueId,
            function(data) {
                $scope.issue = data;
                $scope.comments = data.comments;
                $scope.tags = data.tags;
            },
            function(error) {
                $scope.error = error;
            }
        );


    })
    //Add issue controller
.controller('createIssueCtrl', function(qimgUrl, qimgToken, CameraService, $ionicHistory,IssueService, $log, $http, $scope, apiUrl, geolocation, $state){
    
    $scope.issueToAdd = {};
    $scope.tagToAdd =  {};
   
    $scope.placeholderUrl = 'http://www.lifsstill.com/wp-content/uploads/2014/05/upload-empty.png';
	
    //To prevent firefox geoloc but we first set geoData
    $scope.issueToAdd.lat = 46.78;
    $scope.issueToAdd.lng = 6.65;
    
    
    geolocation.getLocation().then(function (data) {
        $scope.issueToAdd.lat = data.coords.latitude;
        $scope.issueToAdd.lng = data.coords.longitude;
                
    }, function (error) {
        //TO DO ERROR HANDLING ($WINDOW WARNING)
        
    });

	// GET issueTypes
	IssueService.getIssueTypes(
		function(data){
			$scope.issuetypes = data;
		},
		function(error){
			$scope.error = error;
		}
	);
    $scope.createIssue = function (issueToAdd){
        var tagScope = $scope;        
        if(issueToAdd.imageUrl === undefined){
            //empty placeholder
			issueToAdd.imageUrl = 'http://www.lifsstill.com/wp-content/uploads/2014/05/upload-empty.png';
		}
        IssueService.createIssue(issueToAdd, 
		function(data){
            var id = data.id;
        var url = apiUrl+"/issues/"+id+"/actions";

        var tags = [];       
       
        for(var i=0;i<tagScope.tagToAdd.tags.length;i++){
          tags.push($scope.tagToAdd.tags[i].text);
        }
        
        var tagObj = {
          type : "addTags",
          payload :{
            tags : tags
          }
        }

        $http({
          method: 'POST',
          url: url,
          data: tagObj
        }).success(function(data) {
            console.log("tags added");
        });    

			$state.go('eventmenu.issueDetails', {issueId: data.id});
		},
		function(error){
			alert.error('An error occured : '+ error);
		});
       
    }
    $scope.takeIssuePhoto = function(){
	    takePhoto().then(uploadPhoto).then(function (data) {
	      $scope.issueToAdd.imageUrl = data.data.url;
	    }, function(error) {
			alert(error);
	    });
	}

	function takePhoto(){
		return CameraService.getPicture({
			quality: 75,
			targetWidth: 400,
			targetHeight: 300,
            saveToPhotoAlbum: false,
	        correctOrientation:true,
			// return base64-encoded data instead of a file
			destinationType: Camera.DestinationType.DATA_URL
		});
	}

	function uploadPhoto(imageData){
		var result = $http({
			method: "POST",
			url: qimgUrl + "/images",
			headers: {
				Authorization: "Bearer " + qimgToken
			},
			data: {
				data: imageData
			}
		});

		return result;
	}
})
    
  
    .factory("CameraService", function($q) {
	return {
		getPicture: function(options) {
			var deferred = $q.defer();
			navigator.camera.getPicture(
				function(result) {
					// do any magic you need
					deferred.resolve(result);
				}, 
				function(err) {
					deferred.reject(err);
				}, 
				options
			);
			return deferred.promise;
		}
	}
})

    .factory('IssueService', function($http, apiUrl, $log) {
        return {

            //Get All Issue
            getIssues: function(page, callback, errorCallback) {
                $http({
                    method: 'GET',
                    url: apiUrl + '/issues/',
                    headers: {
					'x-pagination': page + ';20',
					'x-sort': '-createdOn'
				
				}
                    

                }).success(function(data, status, headers, config) {
                    callback(data);
                }).error(function(data, status, headers, config) {
                    errorCallback(data);
                });
            },
            
            //Get a specific issue with details
            getDetails: function(issueId, callback, errorCallback) {
                $http({
                    method: 'GET',
                    url: apiUrl + '/issues/' + issueId,
                }).success(function(data, status, headers, config) {
                    callback(data);
                }).error(function(data, status, headers, config) {
                    errorCallback(data);
                });
            },
            //get specific issue comments
            getComments: function(issueId, callback, errorCallback) {
                $http({
                    method: 'GET',
                    url: apiUrl + '/issues/' + issueId,
                }).success(function(data, status, headers, config) {
                    callback(data.comments);
                }).error(function(data, status, headers, config) {
                    errorCallback(data);
                });
            },
            //get all issue Types
            getIssueTypes: function(callback, errorCallback) {
                $http({
                    method: 'GET',
                    url: apiUrl + '/issueTypes'
                }).success(function(data, status, headers, config) {
                    callback(data);
                }).error(function(data, status, headers, config) {
                    errorCallback(data);
                });
            },
            //get issues related to a specific user
            getMyIssues: function(page, callback, errorCallback) {
                $http({
                    method: 'GET',
                    url: apiUrl + '/me/issues',
                    headers: {
					'x-pagination': page + ';20'
				}
                }).success(function(data, status, headers, config) {
                    callback(data);
                }).error(function(data, status, headers, config) {
                    errorCallback(data);
                });
            },
            // Create an issue
		    createIssue : function (issue, callback, errorCallback){
			$http({
				method: 'POST',
				url: apiUrl + '/issues',
				data: issue
			}).success(function(data, status, headers, config){
				callback(data);		
			}).error(function(data, status, headers, config){
				errorCallback(data);
			});
		},
        }
    });